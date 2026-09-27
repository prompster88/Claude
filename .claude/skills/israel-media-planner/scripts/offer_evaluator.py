#!/usr/bin/env python3
"""Normalize Israeli media offers to comparable net metrics and flag vs. benchmarks.

Input: a CSV or JSON file (list of objects) with one row per offer line.
All money in ILS, excluding VAT unless --vat is given.

Columns (only vendor, medium and gross_cost are required; the rest are optional):
  vendor            e.g. "Keshet 12", "Ynet", "Galgalatz"
  medium            tv | radio | display | video | native | social | ooh | dooh | influencer | podcast | sponsorship
  format            free text, e.g. "30s prime", "sponsored article"
  gross_cost        price as quoted before discount
  discount_pct      discount off gross, 0-100 (default 0)
  agency_fee_pct    agency fee on net media, 0-100 (default 0)
  extra_costs       production/installation/distribution costs (default 0)
  impressions       delivered impressions / contacts / views (reach events)
  viewability_pct   share of impressions viewable, 0-100 (default 100)
  target_share_pct  share of delivery on the real target audience, 0-100 (default 100)
  grps              rating points on the real target (TV/radio)
  completes         completed video views (100%)
  clicks            expected clicks
  bonus_value       nominal value of bonus/added value as claimed by vendor (ILS)
  bonus_quality     0-1, how usable the bonus is (1 = on-target prime; 0.1 = overnight remnant). Default 0.3

Usage:
  python offer_evaluator.py offers.csv [--benchmarks benchmarks.json] [--vat 18] [--json]
"""
import argparse
import csv
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))


def num(row, key, default=0.0):
    v = row.get(key)
    if v is None or str(v).strip() == "":
        return default
    return float(str(v).replace(",", "").replace("₪", "").strip())


def load_rows(path):
    if path.endswith(".json"):
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    with open(path, encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))


def evaluate(row, bench, vat):
    medium = str(row.get("medium", "")).strip().lower()
    gross = num(row, "gross_cost")
    net_media = gross * (1 - num(row, "discount_pct") / 100)
    total = net_media * (1 + num(row, "agency_fee_pct") / 100) + num(row, "extra_costs")
    total_vat = total * (1 + vat / 100)

    impressions = num(row, "impressions")
    eff_impr = impressions * num(row, "viewability_pct", 100) / 100 * num(row, "target_share_pct", 100) / 100
    bonus_real = num(row, "bonus_value") * num(row, "bonus_quality", 0.3)

    out = {
        "vendor": row.get("vendor", ""),
        "medium": medium,
        "format": row.get("format", ""),
        "gross": round(gross),
        "net_total": round(total),
        "net_total_incl_vat": round(total_vat),
        "effective_discount_pct": round((1 - total / gross) * 100, 1) if gross else None,
        "bonus_claimed": round(num(row, "bonus_value")),
        "bonus_real_value": round(bonus_real),
        "metrics": {},
        "flags": [],
    }
    m = out["metrics"]
    if impressions:
        m["cpm_nominal"] = round(total / impressions * 1000, 1)
    if eff_impr:
        m["cpm_effective"] = round(total / eff_impr * 1000, 1)
    grps = num(row, "grps")
    if grps:
        m["cpp"] = round(total / grps)
    if num(row, "completes"):
        m["cpcv"] = round(total / num(row, "completes"), 3)
    if num(row, "clicks"):
        m["cpc"] = round(total / num(row, "clicks"), 2)

    # Benchmark comparison
    b = bench.get(medium, {})
    # Benchmark "cpm" is a market (nominal) CPM, so compare it to cpm_nominal.
    alias = {"cpm": "cpm_nominal"}
    for metric, rng in b.items():
        key = alias.get(metric, metric)
        if metric.startswith("_") or key not in m:
            continue
        lo, hi = rng
        val = m[key]
        if val > hi:
            out["flags"].append(f"{metric} {val} ABOVE typical range {lo}-{hi} (+{round((val / hi - 1) * 100)}% over top)")
        elif val < lo:
            out["flags"].append(f"{metric} {val} BELOW typical range {lo}-{hi} — great price or check delivery quality")
        else:
            out["flags"].append(f"{metric} {val} within typical range {lo}-{hi}")

    # Hygiene flags
    if m.get("cpm_effective") and m.get("cpm_nominal") and m["cpm_effective"] > 2 * m["cpm_nominal"]:
        waste = round((1 - m["cpm_nominal"] / m["cpm_effective"]) * 100)
        out["flags"].append(f"~{waste}% of impressions are non-viewable or off-target — cheap CPM is misleading")
    if not impressions and not grps and medium not in ("sponsorship",):
        out["flags"].append("No delivery guarantee (impressions/GRPs) — ask for one")
    if impressions and num(row, "viewability_pct", -1) == -1 and medium in ("display", "video", "native"):
        out["flags"].append("Viewability not specified — demand >=70% viewable")
    if num(row, "target_share_pct", -1) == -1:
        out["flags"].append("Target-audience share unknown — metrics assume 100% on target (optimistic)")
    if num(row, "bonus_value") and bonus_real < 0.5 * num(row, "bonus_value"):
        out["flags"].append(f"Bonus worth ~{round(bonus_real)} vs. claimed {round(num(row, 'bonus_value'))} — low-quality added value")
    if num(row, "discount_pct") >= 60:
        out["flags"].append("Very large 'discount' — rate card is inflated; judge only the net")
    return out


def to_markdown(results):
    lines = [
        "| Vendor | Format | Net (ex VAT) | Eff. disc. | Key metrics | Real bonus | Flags |",
        "|---|---|---|---|---|---|---|",
    ]
    for r in results:
        metrics = ", ".join(f"{k}={v}" for k, v in r["metrics"].items()) or "—"
        flags = "<br>".join(r["flags"]) or "—"
        disc = f"{r['effective_discount_pct']}%" if r["effective_discount_pct"] is not None else "—"
        lines.append(
            f"| {r['vendor']} | {r['medium']} {r['format']} | ₪{r['net_total']:,} | {disc} | {metrics} | ₪{r['bonus_real_value']:,} | {flags} |"
        )
    total = sum(r["net_total"] for r in results)
    lines.append(f"\n**Total net (ex VAT): ₪{total:,}**")
    return "\n".join(lines)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("offers")
    ap.add_argument("--benchmarks", default=os.path.join(HERE, "benchmarks.json"))
    ap.add_argument("--vat", type=float, default=18.0, help="VAT percent (Israel: 18 since Jan 2025)")
    ap.add_argument("--json", action="store_true", help="output JSON instead of markdown")
    args = ap.parse_args()

    bench = {}
    if os.path.exists(args.benchmarks):
        with open(args.benchmarks, encoding="utf-8") as f:
            bench = json.load(f)
    results = [evaluate(r, bench, args.vat) for r in load_rows(args.offers)]
    if args.json:
        json.dump(results, sys.stdout, ensure_ascii=False, indent=2)
    else:
        print(to_markdown(results))


if __name__ == "__main__":
    main()
