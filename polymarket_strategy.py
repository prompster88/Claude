"""
Polymarket $100 → $10,000 Short-Term Trading Strategy
=====================================================
Mathematical framework: Kelly Criterion + Expected Value maximization
Target: 100x return in ≤7 days via compounding mispriced markets
"""

import math
import json
from dataclasses import dataclass, field
from typing import Optional
from enum import Enum


# ─────────────────────────────────────────────
# DATA MODELS
# ─────────────────────────────────────────────

class MarketCategory(Enum):
    CRYPTO_PRICE   = "crypto_price"
    POLITICS       = "politics"
    ECONOMICS      = "economics"
    SPORTS         = "sports"
    BREAKING_NEWS  = "breaking_news"
    GEOPOLITICS    = "geopolitics"


class EdgeType(Enum):
    INFORMATION  = "information"   # You know something the market doesn't yet
    MODEL        = "model"         # Your probability model is superior
    TIMING       = "timing"        # React faster to new information
    LIQUIDITY    = "liquidity"     # Thin market with outsized spread
    RECENCY_BIAS = "recency_bias"  # Market overweights recent events


@dataclass
class Market:
    id: str
    title: str
    category: MarketCategory
    market_prob: float          # Current market-implied probability (0-1)
    true_prob: float            # Your estimated true probability (0-1)
    liquidity_usd: float        # Total liquidity in USD
    volume_24h: float           # 24h volume in USD
    closes_in_hours: float      # Hours until market resolves
    edge_type: EdgeType
    source_confidence: float    # Confidence in your edge (0-1)
    notes: str = ""

    @property
    def yes_payout_multiple(self) -> float:
        """Payout multiple if YES wins (1 / market_prob)."""
        if self.market_prob <= 0:
            return float("inf")
        return 1.0 / self.market_prob

    @property
    def no_payout_multiple(self) -> float:
        """Payout multiple if NO wins (1 / (1 - market_prob))."""
        if self.market_prob >= 1:
            return float("inf")
        return 1.0 / (1.0 - self.market_prob)

    @property
    def bet_yes(self) -> bool:
        """True if the edge is on YES side, False if on NO side."""
        return self.true_prob > self.market_prob

    @property
    def edge_prob(self) -> float:
        """True probability for the side we are betting."""
        return self.true_prob if self.bet_yes else (1.0 - self.true_prob)

    @property
    def payout_multiple(self) -> float:
        """Payout multiple for the side we are betting."""
        return self.yes_payout_multiple if self.bet_yes else self.no_payout_multiple

    @property
    def expected_value(self) -> float:
        """EV per $1 wagered. Positive = profitable edge."""
        p = self.edge_prob
        b = self.payout_multiple - 1   # net odds
        return p * b - (1 - p)

    @property
    def edge_percent(self) -> float:
        """Magnitude of the probability mispricing."""
        return abs(self.true_prob - self.market_prob)

    @property
    def market_efficiency_score(self) -> float:
        """
        Lower = less efficient = more opportunity.
        Combines spread, volume, and liquidity relative to edge.
        """
        spread_factor   = self.edge_percent / max(self.market_prob * (1 - self.market_prob), 0.01)
        volume_factor   = 1.0 / math.log1p(self.volume_24h + 1)
        liquidity_factor = 1.0 / math.log1p(self.liquidity_usd + 1)
        return spread_factor * (volume_factor + liquidity_factor)

    def __str__(self) -> str:
        side  = "YES" if self.bet_yes else "NO"
        sign  = "+" if self.expected_value >= 0 else ""
        return (
            f"[{self.category.value.upper()}] {self.title}\n"
            f"  Market prob: {self.market_prob:.1%}  |  True prob: {self.true_prob:.1%}  |  "
            f"Bet: {side}  |  EV: {sign}{self.expected_value:.3f} per $1"
        )


# ─────────────────────────────────────────────
# KELLY CRITERION ENGINE
# ─────────────────────────────────────────────

class KellyCriterion:
    """
    Full and fractional Kelly position-sizing.

    Kelly fraction f* = (b·p - q) / b
      where:
        p = true probability of winning
        q = 1 - p
        b = net payout odds (payout_multiple - 1)
    """

    @staticmethod
    def full_kelly(p: float, payout_multiple: float) -> float:
        b = payout_multiple - 1
        q = 1 - p
        if b <= 0:
            return 0.0
        f = (b * p - q) / b
        return max(0.0, f)

    @staticmethod
    def fractional_kelly(p: float, payout_multiple: float, fraction: float = 0.25) -> float:
        """Quarter-Kelly is standard for volatile / uncertain-edge situations."""
        return KellyCriterion.full_kelly(p, payout_multiple) * fraction

    @staticmethod
    def position_size(
        bankroll: float,
        p: float,
        payout_multiple: float,
        kelly_fraction: float = 0.25,
        max_bet_pct: float = 0.40,
    ) -> float:
        """
        Dollar amount to wager given bankroll.

        Caps at max_bet_pct of bankroll as a hard risk limit regardless
        of Kelly output (important when true_prob confidence is imperfect).
        """
        kelly = KellyCriterion.fractional_kelly(p, payout_multiple, kelly_fraction)
        raw_bet = bankroll * kelly
        max_bet = bankroll * max_bet_pct
        return round(min(raw_bet, max_bet), 2)


# ─────────────────────────────────────────────
# COMPOUND GROWTH PLANNER
# ─────────────────────────────────────────────

@dataclass
class CompoundStep:
    step: int
    bet_amount: float
    market_title: str
    bet_side: str
    true_prob: float
    payout_multiple: float
    win_bankroll: float
    lose_bankroll: float
    cumulative_growth: float


class CompoundGrowthPlanner:
    """
    Plans a sequence of bets that compound to the 100x target.

    Strategy: Each step targets a multiplier M such that
    M^N ≥ target_multiplier.  We want M to come from positive-EV markets
    so the path is mathematically valid, not gambling on pure luck.
    """

    def __init__(self, starting_bankroll: float = 100.0, target_multiplier: float = 100.0):
        self.starting_bankroll  = starting_bankroll
        self.target_multiplier  = target_multiplier
        self.target_bankroll    = starting_bankroll * target_multiplier

    def minimum_steps(self, per_step_multiplier: float) -> int:
        """How many sequential wins are needed at this per-step multiplier."""
        if per_step_multiplier <= 1:
            return float("inf")
        return math.ceil(math.log(self.target_multiplier) / math.log(per_step_multiplier))

    def win_probability_for_path(self, markets: list[Market]) -> float:
        """Joint probability of winning all bets in a sequential path."""
        p = 1.0
        for m in markets:
            p *= m.edge_prob
        return p

    def build_path(
        self,
        markets: list[Market],
        kelly_fraction: float = 0.25,
        max_bet_pct: float = 0.40,
    ) -> list[CompoundStep]:
        """
        Build a concrete step-by-step compound plan from an ordered list
        of markets.  Bet sizing follows fractional Kelly on each step,
        reinvesting winnings.
        """
        steps   = []
        bankroll = self.starting_bankroll

        for i, market in enumerate(markets, 1):
            bet = KellyCriterion.position_size(
                bankroll,
                market.edge_prob,
                market.payout_multiple,
                kelly_fraction,
                max_bet_pct,
            )
            profit_if_win  = bet * (market.payout_multiple - 1)
            win_bankroll   = round(bankroll - bet + bet * market.payout_multiple, 2)
            lose_bankroll  = round(bankroll - bet, 2)
            growth         = win_bankroll / self.starting_bankroll

            steps.append(CompoundStep(
                step              = i,
                bet_amount        = bet,
                market_title      = market.title,
                bet_side          = "YES" if market.bet_yes else "NO",
                true_prob         = market.edge_prob,
                payout_multiple   = market.payout_multiple,
                win_bankroll      = win_bankroll,
                lose_bankroll     = lose_bankroll,
                cumulative_growth = growth,
            ))

            bankroll = win_bankroll  # assume win for path projection

        return steps

    def print_path(self, steps: list[CompoundStep]):
        print(f"\n{'='*70}")
        print(f"  COMPOUND GROWTH PATH  |  Target: ${self.target_bankroll:,.0f}")
        print(f"{'='*70}")
        for s in steps:
            print(
                f"  Step {s.step}: Bet ${s.bet_amount:.2f} on {s.bet_side} "
                f"({s.true_prob:.1%} true prob, {s.payout_multiple:.2f}x payout)\n"
                f"         {s.market_title[:55]}\n"
                f"         WIN → ${s.win_bankroll:,.2f}  |  LOSE → ${s.lose_bankroll:.2f}  "
                f"|  Cumulative: {s.cumulative_growth:.1f}x"
            )
        final = steps[-1].win_bankroll if steps else self.starting_bankroll
        pwin  = math.prod(s.true_prob for s in steps)
        print(f"\n  Final bankroll if all win : ${final:,.2f}")
        print(f"  Joint win probability     : {pwin:.2%}")
        print(f"  Expected value of path    : ${final * pwin:.2f}")
        print(f"{'='*70}\n")


# ─────────────────────────────────────────────
# MARKET SCANNER / EDGE DETECTOR
# ─────────────────────────────────────────────

class MarketScanner:
    """
    Ranks candidate markets by opportunity quality.

    Scoring weights:
      40% — Expected Value per $1
      30% — Edge magnitude (abs prob difference)
      20% — Source confidence
      10% — Market inefficiency score (thin liquidity = more opportunity)
    """

    EV_WEIGHT           = 0.40
    EDGE_WEIGHT         = 0.30
    CONFIDENCE_WEIGHT   = 0.20
    INEFFICIENCY_WEIGHT = 0.10

    # Minimum EV threshold — reject any market below this
    MIN_EV = 0.05      # +5 cents per dollar wagered
    MIN_EDGE = 0.04    # minimum 4 percentage point edge

    def score(self, market: Market) -> float:
        if market.expected_value < self.MIN_EV:
            return 0.0
        if market.edge_percent < self.MIN_EDGE:
            return 0.0

        ev_score          = min(market.expected_value / 1.0, 1.0)
        edge_score        = min(market.edge_percent / 0.30, 1.0)
        confidence_score  = market.source_confidence
        ineff_score       = min(market.market_efficiency_score / 2.0, 1.0)

        return (
            self.EV_WEIGHT           * ev_score
            + self.EDGE_WEIGHT       * edge_score
            + self.CONFIDENCE_WEIGHT * confidence_score
            + self.INEFFICIENCY_WEIGHT * ineff_score
        )

    def rank(self, markets: list[Market]) -> list[tuple[float, Market]]:
        scored = [(self.score(m), m) for m in markets]
        return sorted(scored, key=lambda x: x[0], reverse=True)

    def filter_positive_ev(self, markets: list[Market]) -> list[Market]:
        return [m for m in markets if m.expected_value >= self.MIN_EV and m.edge_percent >= self.MIN_EDGE]

    def best_n(self, markets: list[Market], n: int = 5) -> list[Market]:
        ranked = self.rank(markets)
        return [m for _, m in ranked[:n]]


# ─────────────────────────────────────────────
# RISK MANAGEMENT
# ─────────────────────────────────────────────

class RiskManager:
    """
    Enforces hard stop-loss rules and drawdown limits.
    These are non-negotiable — they prevent ruin from model error.
    """

    def __init__(
        self,
        starting_bankroll: float,
        max_daily_loss_pct: float = 0.50,   # stop if down 50% in one day
        max_single_bet_pct: float = 0.40,   # never wager more than 40% on one market
        min_ev_threshold: float  = 0.05,    # refuse bets below +5% EV
        min_edge_threshold: float = 0.04,   # refuse bets below 4pp edge
    ):
        self.starting_bankroll     = starting_bankroll
        self.max_daily_loss_pct    = max_daily_loss_pct
        self.max_single_bet_pct    = max_single_bet_pct
        self.min_ev_threshold      = min_ev_threshold
        self.min_edge_threshold    = min_edge_threshold
        self.daily_starting_bankroll = starting_bankroll

    def reset_day(self, current_bankroll: float):
        self.daily_starting_bankroll = current_bankroll

    def approve_bet(self, bankroll: float, bet_amount: float, market: Market) -> tuple[bool, str]:
        """Returns (approved, reason)."""
        # Hard EV gate
        if market.expected_value < self.min_ev_threshold:
            return False, f"EV too low: {market.expected_value:.3f} < {self.min_ev_threshold}"

        # Hard edge gate
        if market.edge_percent < self.min_edge_threshold:
            return False, f"Edge too small: {market.edge_percent:.2%} < {self.min_edge_threshold:.2%}"

        # Max bet size
        if bet_amount > bankroll * self.max_single_bet_pct:
            return False, f"Bet ${bet_amount:.2f} exceeds {self.max_single_bet_pct:.0%} of bankroll"

        # Daily drawdown guard
        loss_today = self.daily_starting_bankroll - bankroll
        if loss_today / self.daily_starting_bankroll > self.max_daily_loss_pct:
            return False, f"Daily loss limit hit: down {loss_today/self.daily_starting_bankroll:.1%} today"

        return True, "Approved"

    def describe(self) -> str:
        return (
            f"Risk limits: max {self.max_daily_loss_pct:.0%} daily loss | "
            f"max {self.max_single_bet_pct:.0%} per bet | "
            f"min EV +{self.min_ev_threshold:.0%} | "
            f"min edge {self.min_edge_threshold:.0%}"
        )


# ─────────────────────────────────────────────
# STRATEGY ENGINE (ORCHESTRATOR)
# ─────────────────────────────────────────────

class PolymarketStrategy:
    """
    Top-level orchestrator that ties scanner, Kelly sizer, compound
    planner, and risk manager together.
    """

    def __init__(self, bankroll: float = 100.0):
        self.bankroll  = bankroll
        self.scanner   = MarketScanner()
        self.planner   = CompoundGrowthPlanner(bankroll, target_multiplier=100.0)
        self.risk      = RiskManager(bankroll)
        self.kelly     = KellyCriterion()
        self.log: list[str] = []

    def analyze(self, markets: list[Market]) -> dict:
        ranked = self.scanner.rank(markets)
        positive_ev = self.scanner.filter_positive_ev(markets)
        best = self.scanner.best_n(markets, n=7)

        return {
            "total_markets_scanned": len(markets),
            "positive_ev_count": len(positive_ev),
            "top_markets": best,
            "ranked_with_scores": ranked,
        }

    def size_bet(self, market: Market, kelly_fraction: float = 0.25) -> float:
        return self.kelly.position_size(
            self.bankroll,
            market.edge_prob,
            market.payout_multiple,
            kelly_fraction,
            self.risk.max_single_bet_pct,
        )

    def build_compound_path(self, top_markets: list[Market]) -> list[CompoundStep]:
        return self.planner.build_path(top_markets)

    def full_report(self, markets: list[Market]):
        analysis = self.analyze(markets)
        print(f"\n{'='*70}")
        print("  POLYMARKET EDGE ANALYSIS REPORT")
        print(f"  Bankroll: ${self.bankroll:.2f}  |  Target: ${self.bankroll*100:,.0f}")
        print(f"  {self.risk.describe()}")
        print(f"{'='*70}")
        print(f"\n  Markets scanned: {analysis['total_markets_scanned']}")
        print(f"  Positive-EV opportunities: {analysis['positive_ev_count']}\n")

        print("  TOP RANKED OPPORTUNITIES:")
        print(f"  {'Rank':<5} {'Score':<7} {'EV/1$':<8} {'Edge':<8} {'Side':<5} Market")
        print(f"  {'-'*65}")
        for rank, (score, market) in enumerate(analysis["ranked_with_scores"][:8], 1):
            side = "YES" if market.bet_yes else "NO "
            print(
                f"  {rank:<5} {score:<7.3f} {market.expected_value:<+8.3f} "
                f"{market.edge_percent:<8.1%} {side:<5} {market.title[:42]}"
            )

        print(f"\n  SUGGESTED BET SIZES (¼-Kelly, bankroll=${self.bankroll:.2f}):")
        print(f"  {'-'*65}")
        for market in analysis["top_markets"][:5]:
            bet   = self.size_bet(market)
            side  = "YES" if market.bet_yes else "NO"
            approved, reason = self.risk.approve_bet(self.bankroll, bet, market)
            status = "✓" if approved else "✗"
            print(
                f"  {status} ${bet:<7.2f} on {side:<4}  "
                f"({market.edge_prob:.1%} → {market.payout_multiple:.2f}x)  "
                f"{market.title[:38]}"
            )
            if not approved:
                print(f"       BLOCKED: {reason}")

        # Build compound path from top 7 markets
        top7 = analysis["top_markets"]
        if top7:
            path = self.build_compound_path(top7)
            self.planner.print_path(path)
