"""
run_strategy.py — Full Strategy Demonstration
==============================================
Runs the complete $100 → $10,000 strategy with realistic example markets,
compound path planning, and actionable output.

Usage:
    python run_strategy.py
"""

import math
from polymarket_strategy import (
    Market, MarketCategory, EdgeType,
    KellyCriterion, CompoundGrowthPlanner, MarketScanner,
    RiskManager, PolymarketStrategy,
)
from market_edge_finder import EdgeHunter
from playbooks import ALL_PLAYBOOKS, print_playbook


# ─────────────────────────────────────────────────────────────────────────────
# EXAMPLE MARKET INPUTS (replace with live data from your edge-finding process)
# ─────────────────────────────────────────────────────────────────────────────
# These are illustrative examples showing how the system works.
# In live trading, these inputs come from:
#   - Deribit options chain (crypto)
#   - CME FedWatch (economics)
#   - Pinnacle closing lines (sports)
#   - Primary news sources (breaking news)
# ─────────────────────────────────────────────────────────────────────────────

def build_example_markets(hunter: EdgeHunter) -> list[Market]:
    markets = []

    # ── CRYPTO: BTC options Black-Scholes edge ──────────────────────────────
    # Scenario: Deribit 24h IV at 65%, BTC at $67,000, market asks $68,000 end-of-day
    # BS model gives 42% probability; Polymarket shows only 35%
    m1 = hunter.crypto_price_edge(
        title               = "Will BTC be above $68,000 by end of day?",
        strike_price        = 68_000,
        current_price       = 67_000,
        iv_annual           = 0.65,
        hours_to_expiry     = 16.0,
        polymarket_prob     = 0.35,
    )
    if m1: markets.append(m1)

    # ── CRYPTO: ETH underpriced downside ────────────────────────────────────
    m2 = hunter.crypto_price_edge(
        title               = "Will ETH be below $3,200 this week?",
        strike_price        = 3_200,
        current_price       = 3_350,
        iv_annual           = 0.72,
        hours_to_expiry     = 72.0,
        polymarket_prob     = 0.28,
    )
    if m2: markets.append(m2)

    # ── ECONOMICS: Fed rate divergence ──────────────────────────────────────
    m3 = hunter.fed_rate_edge(
        title                   = "Fed holds rates at May FOMC?",
        fedwatch_prob           = 0.82,
        polymarket_prob         = 0.71,
        hours_to_announcement   = 36.0,
    )
    if m3: markets.append(m3)

    # ── ECONOMICS: CPI miss ─────────────────────────────────────────────────
    m4 = hunter.fed_rate_edge(
        title                   = "Will CPI come in below 3.0% this month?",
        fedwatch_prob           = 0.38,
        polymarket_prob         = 0.52,   # retail overbets low-inflation narrative
        hours_to_announcement   = 18.0,
    )
    if m4: markets.append(m4)

    # ── SPORTS: CLV edge ────────────────────────────────────────────────────
    m5 = hunter.sports_clv_edge(
        title           = "Lakers to win vs Celtics tonight?",
        pinnacle_prob   = 0.44,
        polymarket_prob = 0.35,   # Polymarket under-prices underdog
        hours_to_start  = 5.0,
        sport           = "nba",
    )
    if m5: markets.append(m5)

    # ── SPORTS: Soccer CLV ──────────────────────────────────────────────────
    m6 = hunter.sports_clv_edge(
        title           = "Real Madrid to qualify for UCL final?",
        pinnacle_prob   = 0.67,
        polymarket_prob = 0.58,
        hours_to_start  = 26.0,
        sport           = "soccer",
    )
    if m6: markets.append(m6)

    # ── RECENCY BIAS: fade over-priced volatility ───────────────────────────
    m7 = hunter.recency_bias_fade(
        title                = "Another surprise Fed emergency cut in 30 days?",
        base_rate_prob       = 0.04,    # historical: ~4% chance in any 30-day window
        polymarket_prob      = 0.18,    # retail overbets after recent surprise cut
        hours_to_resolution  = 720.0,
        bias_trigger         = "surprise_rate_cut",
    )
    if m7: markets.append(m7)

    # ── BREAKING NEWS: surprise geopolitical ───────────────────────────────
    m8 = hunter.breaking_news_edge(
        title                  = "Will ceasefire hold through the weekend?",
        prior_market_prob      = 0.50,
        new_information_prob   = 0.78,   # peace envoy just announced deal
        minutes_since_news     = 4.0,
        hours_to_resolution    = 60.0,
        confidence             = 0.72,
    )
    if m8: markets.append(m8)

    # ── MANUAL: thin-market liquidity edge ──────────────────────────────────
    # Small, illiquid market where informed traders have not yet entered
    m9 = Market(
        id               = "manual_001",
        title            = "Will inflation data cause 50bp+ move in 10Y yield?",
        category         = MarketCategory.ECONOMICS,
        market_prob      = 0.18,
        true_prob        = 0.30,   # options market implies 30%
        liquidity_usd    = 4_000,
        volume_24h       = 1_200,
        closes_in_hours  = 22.0,
        edge_type        = EdgeType.LIQUIDITY,
        source_confidence = 0.62,
        notes            = "Thin market; swaptions price 30% probability",
    )
    markets.append(m9)

    return markets


# ─────────────────────────────────────────────────────────────────────────────
# MATHEMATICAL FRAMEWORK SUMMARY
# ─────────────────────────────────────────────────────────────────────────────

def print_math_framework():
    print("""
╔══════════════════════════════════════════════════════════════════════╗
║         $100 → $10,000 MATHEMATICAL FRAMEWORK                       ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║  TARGET: 100x return in ≤ 7 days                                     ║
║                                                                      ║
║  COMPOUNDING PATHS TO 100x:                                          ║
║  ┌─────────────────────────────────────────────────────────────┐    ║
║  │ Bets │ Per-bet multiplier │ Joint win prob (if each 65% true)│    ║
║  │  4   │      3.16x         │    17.9%                        │    ║
║  │  5   │      2.51x         │    11.6%                        │    ║
║  │  6   │      2.15x         │     7.5%                        │    ║
║  │  7   │      1.93x         │     4.9%                        │    ║
║  │ 10   │      1.58x         │     1.3%                        │    ║
║  └─────────────────────────────────────────────────────────────┘    ║
║                                                                      ║
║  KEY EQUATIONS:                                                      ║
║  • Kelly fraction:   f* = (b·p - q) / b                              ║
║  • Expected Value:   EV = p·(b) - (1-p)  [per $1]                   ║
║  • Black-Scholes:    P(S_T > K) ≈ N(d₂)                             ║
║  • d₂ = [ln(S/K) + (r - σ²/2)·T] / (σ√T)                           ║
║  • Geometric growth: G = Σ ln(1 + f·b) · p  [Kelly maximizes this]  ║
║                                                                      ║
║  RISK REALITY CHECK:                                                 ║
║  • 100x in 7 days requires concentrated, high-conviction bets        ║
║  • Even with 65% per-trade accuracy, sequential paths fail often     ║
║  • Expected value is positive; variance is extremely high            ║
║  • This is a HIGH-RISK strategy — position sizing is everything      ║
║  • Capital at risk: treat the $100 as risk capital you can lose      ║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝
""")


def print_week_schedule():
    print("""
╔══════════════════════════════════════════════════════════════════════╗
║              7-DAY EXECUTION SCHEDULE                                ║
╠═══════════╦══════════════════════════════════════════════════════════╣
║  DAY 1    ║ Target 2-3x. Use ONLY crypto options or FedWatch edge.  ║
║           ║ Scan all playbooks. Take the 2 highest-scored trades.   ║
║           ║ Max bet: 35% of bankroll per trade. Kelly ¼ fraction.   ║
╠═══════════╬══════════════════════════════════════════════════════════╣
║  DAY 2    ║ Same discipline. Add sports CLV if event available.     ║
║           ║ No chasing losses. If down 50%, pause and re-evaluate.  ║
╠═══════════╬══════════════════════════════════════════════════════════╣
║  DAY 3    ║ News-intensive day (monitor Reuters/Bloomberg heavily).  ║
║           ║ Breaking news edge is highest this day if events occur.  ║
╠═══════════╬══════════════════════════════════════════════════════════╣
║  DAY 4    ║ Mid-week re-balance. Recalculate Kelly on new bankroll. ║
║           ║ Lock in 20% of gains to floor (never bet below floor).  ║
╠═══════════╬══════════════════════════════════════════════════════════╣
║  DAY 5    ║ Friday FOMC/data window is often highest-EV day.        ║
║           ║ Focus exclusively on highest-score market from scanner.  ║
╠═══════════╬══════════════════════════════════════════════════════════╣
║  DAY 6-7  ║ Weekend: fewer economic markets, use sports CLV only.   ║
║           ║ Conservative sizing — Kelly/6 instead of Kelly/4.       ║
╚═══════════╩══════════════════════════════════════════════════════════╝
""")


def print_data_sources_master():
    print("""
╔══════════════════════════════════════════════════════════════════════╗
║              MASTER DATA SOURCE CHECKLIST                            ║
╠══════════════════════════════════════════════════════════════════════╣
║  FREE SOURCES                                                        ║
║  • CME FedWatch:    cmegroup.com/markets/interest-rates/fedwatch     ║
║  • Deribit:         deribit.com  (options chain, IV)                 ║
║  • The Odds API:    the-odds-api.com  (free tier: 500 req/month)    ║
║  • Reuters:         reuters.com  (set browser push notifications)    ║
║  • AP News:         apnews.com                                       ║
║  • Metaculus:       metaculus.com  (community forecasts)             ║
║  • Good Judgment:   gjopen.com  (superforecaster consensus)          ║
║  • Kalshi:          kalshi.com  (cross-reference prediction market)  ║
║  • PredictIt:       predictit.org  (political market reference)     ║
║                                                                      ║
║  POLYMARKET TOOLS                                                    ║
║  • Markets API:     gamma-api.polymarket.com/markets                 ║
║  • Activity feed:   polymarket.com/activity                          ║
║  • CLOB API:        clob.polymarket.com  (order book data)          ║
║                                                                      ║
║  SETUP STEPS (Day 0 before trading)                                  ║
║  1. Fund Polymarket wallet with USDC on Polygon network              ║
║  2. Enable browser push notifications for Reuters + AP               ║
║  3. Bookmark CME FedWatch + Deribit                                  ║
║  4. Sign up for The Odds API free tier                               ║
║  5. Set Polymarket price alerts on your target markets               ║
╚══════════════════════════════════════════════════════════════════════╝
""")


# ─────────────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────────────

def main():
    BANKROLL = 100.0

    print_math_framework()

    hunter   = EdgeHunter()
    strategy = PolymarketStrategy(bankroll=BANKROLL)

    # Build example market list using edge-finding logic
    markets = build_example_markets(hunter)

    print(f"  Markets identified by edge-finding algorithms: {len(markets)}\n")

    # Print individual market summaries
    print("  INDIVIDUAL MARKET ANALYSIS:")
    print(f"  {'-'*65}")
    scanner = MarketScanner()
    for m in markets:
        score = scanner.score(m)
        if score > 0:
            print(f"  {m}")
            print(f"    Payout {m.payout_multiple:.2f}x | Score {score:.3f} | "
                  f"Kelly size: ${KellyCriterion.position_size(BANKROLL, m.edge_prob, m.payout_multiple):.2f}")
            print()

    # Full ranked report + compound path
    strategy.full_report(markets)

    # 7-day execution schedule
    print_week_schedule()

    # Data sources checklist
    print_data_sources_master()

    # Print the two most relevant playbooks
    print("\n  SELECTED PLAYBOOKS FOR THIS SESSION:\n")
    from playbooks import CRYPTO_OPTIONS_PLAYBOOK, FED_DIVERGENCE_PLAYBOOK
    print_playbook(CRYPTO_OPTIONS_PLAYBOOK)
    print_playbook(FED_DIVERGENCE_PLAYBOOK)

    # Final probability reality check
    planner = CompoundGrowthPlanner(BANKROLL, target_multiplier=100.0)
    print("\n  MINIMUM BETS REQUIRED FOR VARIOUS MULTIPLIERS:")
    for multiplier in [1.5, 2.0, 2.5, 3.0, 4.0]:
        n = planner.minimum_steps(multiplier)
        # joint prob if each bet has 60% true probability
        joint = 0.60 ** n
        print(f"    {multiplier:.1f}x per bet → {n} bets needed | "
              f"joint 60%-accuracy prob = {joint:.2%}")

    print(f"\n  {'='*70}")
    print("  CRITICAL REMINDERS:")
    print("  1. Only bet on POSITIVE EV markets — if EV < 0, skip it entirely")
    print("  2. Never bet more than 40% of bankroll on a single market")
    print("  3. Verify ALL sources independently before placing a bet")
    print("  4. 100x in 7 days is possible with an edge — not guaranteed")
    print("  5. Treat the $100 as risk capital — be prepared to lose it all")
    print(f"  {'='*70}\n")


if __name__ == "__main__":
    main()
