"""
Tactical Playbooks — Category-Specific Execution Guides
========================================================
Each playbook defines WHERE to look, HOW to find the edge, WHEN to bet,
and HOW MUCH to wager for a specific market category.
"""

from dataclasses import dataclass
from typing import Optional
from polymarket_strategy import MarketCategory, EdgeType


# ─────────────────────────────────────────────────────────────────────────────
# PLAYBOOK BASE
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class Playbook:
    name: str
    category: MarketCategory
    edge_type: EdgeType
    min_ev: float
    kelly_fraction: float
    max_position_pct: float
    data_sources: list[str]
    identification_steps: list[str]
    timing_rules: list[str]
    exit_rules: list[str]
    known_traps: list[str]
    expected_frequency: str        # how often this opportunity appears


# ─────────────────────────────────────────────────────────────────────────────
# PLAYBOOK 1: CRYPTO OPTIONS ARBITRAGE
# ─────────────────────────────────────────────────────────────────────────────

CRYPTO_OPTIONS_PLAYBOOK = Playbook(
    name            = "Crypto Options Arbitrage",
    category        = MarketCategory.CRYPTO_PRICE,
    edge_type       = EdgeType.MODEL,
    min_ev          = 0.08,
    kelly_fraction  = 0.25,
    max_position_pct = 0.35,

    data_sources = [
        "Deribit options chain (deribit.com/api/v2/public/get_book_summary_by_currency)",
        "CME Bitcoin futures implied vol (cmegroup.com)",
        "Polymarket crypto markets (gamma.polymarket.com/markets?category=crypto)",
        "CoinGlass funding rate & liquidation data (coinglass.com)",
    ],

    identification_steps = [
        "1. Pull BTC/ETH 24h options from Deribit — get ATM implied vol",
        "2. Identify Polymarket 'Will BTC be above $X by [date]?' markets",
        "3. Run Black-Scholes d₂ calculation with Deribit IV as input",
        "4. Compare N(d₂) to Polymarket price — flag any gap ≥ 5pp",
        "5. Verify gap persists for ≥ 10 min (filter noise, not signal)",
        "6. Check Deribit order book depth — make sure IV quote is liquid",
    ],

    timing_rules = [
        "Best windows: first 30 min after US market open (9:30-10:00 ET)",
        "Avoid: 1h before major macro events (FOMC, CPI, NFP)",
        "Avoid: weekends when Deribit vol is stale",
        "Entry: as soon as gap confirmed on 2 consecutive 5-min candles",
        "Max hold: close before the contract's 6h mark (vol term structure)",
    ],

    exit_rules = [
        "Take profit when PM price converges within 2pp of model price",
        "Stop loss: if market moves 15pp against you — model may be wrong",
        "Always exit 30 min before the market resolves (liquidity dries up)",
        "If Deribit IV spikes >20% in 1h — re-run model before adding size",
    ],

    known_traps = [
        "Deribit IV can spike on order book thin days — double-check vol surface",
        "Polymarket uses UTC midnight resolution — verify timezone vs Deribit",
        "Funding rate extremes signal directional bias not in BS model — adjust",
        "Crypto markets gap overnight; BS log-normal assumption breaks on news",
    ],

    expected_frequency = "2-4 opportunities per day on high-vol crypto days",
)


# ─────────────────────────────────────────────────────────────────────────────
# PLAYBOOK 2: CME FEDWATCH DIVERGENCE
# ─────────────────────────────────────────────────────────────────────────────

FED_DIVERGENCE_PLAYBOOK = Playbook(
    name            = "CME FedWatch vs Polymarket Divergence",
    category        = MarketCategory.ECONOMICS,
    edge_type       = EdgeType.MODEL,
    min_ev          = 0.06,
    kelly_fraction  = 0.30,          # higher fraction — FedWatch is very reliable
    max_position_pct = 0.40,

    data_sources = [
        "CME FedWatch Tool (cmegroup.com/markets/interest-rates/cme-fedwatch-tool)",
        "Fed Funds futures chain on CME (ZQ contracts)",
        "Polymarket FOMC markets (search 'Fed rate' on polymarket.com)",
        "Bloomberg/Reuters FOMC previews for narrative context",
    ],

    identification_steps = [
        "1. Pull current FedWatch implied probability for next FOMC outcome",
        "2. Find matching Polymarket market (same outcome, same date)",
        "3. Calculate gap: |fedwatch_prob - polymarket_prob|",
        "4. If gap ≥ 5pp AND FOMC is within 72h → potential trade",
        "5. Validate: read 3 recent analyst notes — is there genuine uncertainty?",
        "6. Cross-check with Kalshi and Metaculus for consensus confirmation",
    ],

    timing_rules = [
        "Enter positions 24-48h before FOMC — spreads narrow closer in",
        "Highest edge window: 1-3 days out when retail speculates on headlines",
        "Retail traders anchor to CPI/jobs data too strongly — fade them",
        "NEVER enter day-of: thin liquidity + wide spreads eat the edge",
        "If Chair Powell speaks unexpectedly, re-price immediately",
    ],

    exit_rules = [
        "Sell into convergence — take 60% of position when gap halves",
        "Hold remaining 40% to resolution for full payout",
        "Emergency exit: if new unexpected data release changes consensus",
    ],

    known_traps = [
        "FedWatch shows risk-neutral probability, not real-world — they match closely but not perfectly",
        "Unexpected speeches / Fed leaks can whipsaw the market in minutes",
        "Polymarket retail bias: they over-bet 'no rate change' in hiking cycles",
        "Don't confuse 'basis point' probabilities — FedWatch shows 25bp increments",
    ],

    expected_frequency = "6-8 FOMC meetings per year; highest edge day = T-2 to T-1",
)


# ─────────────────────────────────────────────────────────────────────────────
# PLAYBOOK 3: CLOSING LINE VALUE (CLV) — SPORTS
# ─────────────────────────────────────────────────────────────────────────────

SPORTS_CLV_PLAYBOOK = Playbook(
    name            = "Sports Closing Line Value (CLV)",
    category        = MarketCategory.SPORTS,
    edge_type       = EdgeType.MODEL,
    min_ev          = 0.05,
    kelly_fraction  = 0.20,          # lower because sports have more variance
    max_position_pct = 0.25,

    data_sources = [
        "Pinnacle Sports (pinnacle.com) — sharpest closing lines in the world",
        "Betfair Exchange odds (betfair.com) — market-clearing probabilities",
        "The Odds API (the-odds-api.com) — aggregates 40+ bookmakers",
        "Polymarket sports markets",
        "538/FiveThirtyEight historical model data for base rates",
    ],

    identification_steps = [
        "1. Identify upcoming high-volume sports events (NBA, NFL, Champions League)",
        "2. Get Pinnacle closing moneyline — convert American/decimal to probability",
        "3. De-vig the Pinnacle line: P_true = P_raw / (P_raw_home + P_raw_away)",
        "4. Find the equivalent Polymarket binary market",
        "5. Gap ≥ 4pp AND Pinnacle line is recent (< 2h old) → enter",
        "6. Confirm no injury news / weather update that Pinnacle hasn't priced",
    ],

    timing_rules = [
        "Enter 2-6h before game time — CLV is most predictive at this window",
        "Avoid live/in-play markets — execution speed requirement is too high",
        "NBA: best edge appears after injury report drops (6:30pm ET day-of)",
        "Soccer: line moves on team sheet release ~1h before kickoff",
        "NFL: sharp money moves line Thursday–Friday; enter by Saturday at latest",
    ],

    exit_rules = [
        "Hold to resolution — sports markets have clean binary outcomes",
        "Never exit early unless the event is cancelled/postponed",
        "If star player injury confirmed after entry: reassess probability, possibly exit",
    ],

    known_traps = [
        "Public/square money moves Polymarket away from true odds late — that is the opportunity",
        "Never use ESPN/mainstream odds — they're not calibrated for prob estimation",
        "Home underdog recency bias: public over-bets home teams after upset",
        "Playoff/tournament structures change base rates significantly — adjust",
        "Match-fixing risk in lower leagues — stick to top-tier competitions only",
    ],

    expected_frequency = "3-5 quality CLV spots per day across all major sports",
)


# ─────────────────────────────────────────────────────────────────────────────
# PLAYBOOK 4: BREAKING NEWS INFORMATION EDGE
# ─────────────────────────────────────────────────────────────────────────────

BREAKING_NEWS_PLAYBOOK = Playbook(
    name            = "Breaking News Information Edge",
    category        = MarketCategory.BREAKING_NEWS,
    edge_type       = EdgeType.INFORMATION,
    min_ev          = 0.12,          # higher bar — execution risk is real
    kelly_fraction  = 0.20,
    max_position_pct = 0.30,

    data_sources = [
        "Reuters (reuters.com) and AP News — fastest wire services",
        "Bloomberg Terminal alerts (or Bloomberg app)",
        "Official government/central bank press releases",
        "Twitter/X — set up alerts for key accounts (@Reuters, @APPolitics, @FedReserve)",
        "Polymarket activity feed — unusual volume spike = someone knows something",
    ],

    identification_steps = [
        "1. Set up push notifications for Reuters wire, AP, Bloomberg Breaking",
        "2. When breaking news drops, identify all affected Polymarket markets",
        "3. Estimate new true probability based on the specific information",
        "4. Check Polymarket price — has it updated yet?",
        "5. Calculate EV using your new probability estimate",
        "6. If ≥ 12pp gap AND < 8 minutes since news → execute immediately",
        "7. Act ONLY on verified primary sources, never social media rumor",
    ],

    timing_rules = [
        "You have a 3-8 minute window before sophisticated traders reprice",
        "Phone app execution: have Polymarket pre-loaded with USDC ready",
        "Speed > precision here — if gap is obvious, bet first, optimize later",
        "Highest-value windows: surprise FOMC, surprise election results, unexpected geopolitical",
        "Morning hours (6-10am ET) have lowest trader density → longer window",
    ],

    exit_rules = [
        "Exit only if: (a) you were wrong about the news significance, or",
        "(b) the market has fully repriced and there is no residual edge",
        "Most information edge plays: hold to resolution",
    ],

    known_traps = [
        "NEVER trade on social media rumors — verification is essential",
        "Reuters/AP sometimes issue corrections — monitor for 10 min post-entry",
        "Polymarket can pause markets in extreme volatility — check T&Cs",
        "Gas fees and withdrawal times matter — keep USDC pre-funded on Polygon",
        "Insider trading laws vary by jurisdiction — stick to public information only",
    ],

    expected_frequency = "1-3 quality opportunities per week; unpredictable by definition",
)


# ─────────────────────────────────────────────────────────────────────────────
# PLAYBOOK 5: RECENCY BIAS FADE (NO betting on overpriced tails)
# ─────────────────────────────────────────────────────────────────────────────

RECENCY_BIAS_PLAYBOOK = Playbook(
    name            = "Recency Bias Fade",
    category        = MarketCategory.BREAKING_NEWS,
    edge_type       = EdgeType.RECENCY_BIAS,
    min_ev          = 0.07,
    kelly_fraction  = 0.20,
    max_position_pct = 0.25,

    data_sources = [
        "Historical base rates (Wikipedia, government archives, academic databases)",
        "Metaculus historical calibration data (metaculus.com)",
        "Superforecaster community consensus (Good Judgment Open)",
        "Academic literature on base rate neglect and availability heuristic",
    ],

    identification_steps = [
        "1. Identify markets where a dramatic/unusual event just occurred",
        "2. Find the long-run historical base rate for the outcome type",
        "3. Check if Polymarket price significantly exceeds base rate",
        "4. Example: after one surprise Fed hike, markets price next hike too high",
        "5. Example: after one surprise geopolitical event, similar event priced high",
        "6. Gap ≥ 8pp above base rate → NO position is likely +EV",
    ],

    timing_rules = [
        "Best entry: 6-24h after the triggering dramatic event",
        "Bias is strongest in retail-dominated, less-liquid markets",
        "Avoid: do NOT fade in genuine structural-change situations",
        "Never fade if fundamentals have actually changed (regime change, war start)",
        "Longer resolution windows (3-7 days) allow the bias to mean-revert",
    ],

    exit_rules = [
        "Hold to resolution — base rate trades are longer-duration by nature",
        "If a second triggering event occurs: exit and reassess",
        "Take partial profit at 50% position if market reprices 5pp in your favor",
    ],

    known_traps = [
        "Base rate fallacy works BOTH ways — don't apply it when conditions have changed",
        "Availability heuristic can be rational in non-stationary environments",
        "Markets can stay irrational longer than you can stay solvent — size conservatively",
        "Low-liquidity markets: the spread may eat the theoretical edge entirely",
    ],

    expected_frequency = "1-2 per week following high-volatility news cycles",
)


# ─────────────────────────────────────────────────────────────────────────────
# PLAYBOOK REGISTRY
# ─────────────────────────────────────────────────────────────────────────────

ALL_PLAYBOOKS: list[Playbook] = [
    CRYPTO_OPTIONS_PLAYBOOK,
    FED_DIVERGENCE_PLAYBOOK,
    SPORTS_CLV_PLAYBOOK,
    BREAKING_NEWS_PLAYBOOK,
    RECENCY_BIAS_PLAYBOOK,
]


def print_playbook(pb: Playbook):
    print(f"\n{'='*70}")
    print(f"  PLAYBOOK: {pb.name}")
    print(f"  Category: {pb.category.value}  |  Edge: {pb.edge_type.value}")
    print(f"  Min EV: +{pb.min_ev:.0%}  |  Kelly fraction: {pb.kelly_fraction:.0%}  "
          f"|  Max position: {pb.max_position_pct:.0%}")
    print(f"  Frequency: {pb.expected_frequency}")
    print(f"\n  DATA SOURCES:")
    for s in pb.data_sources:
        print(f"    • {s}")
    print(f"\n  HOW TO FIND THE EDGE:")
    for s in pb.identification_steps:
        print(f"    {s}")
    print(f"\n  TIMING RULES:")
    for t in pb.timing_rules:
        print(f"    • {t}")
    print(f"\n  KNOWN TRAPS:")
    for trap in pb.known_traps:
        print(f"    ⚠ {trap}")
    print(f"{'='*70}")
