import os
import csv
import logging
import numpy as np

logger = logging.getLogger("HeatVision.AILayoutEngine")

def parse_pos_csv(csv_filepath):
    """
    Parses a POS transaction CSV file and aggregates total revenue, transaction counts,
    and average basket size per store zone. (Issue #35)
    """
    if not os.path.exists(csv_filepath):
        logger.error(f"POS CSV file does not exist at path: {csv_filepath}")
        return {}

    zone_sales = {}

    with open(csv_filepath, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            zid = row.get("zone_id", "unknown")
            try:
                amount = float(row.get("total_amount", 0.0))
                qty = int(row.get("quantity", 1))
            except ValueError:
                continue

            if zid not in zone_sales:
                zone_sales[zid] = {
                    "zone_id": zid,
                    "total_revenue": 0.0,
                    "transaction_count": 0,
                    "total_items_sold": 0,
                    "categories": set()
                }

            zone_sales[zid]["total_revenue"] += amount
            zone_sales[zid]["transaction_count"] += 1
            zone_sales[zid]["total_items_sold"] += qty
            if "product_category" in row:
                zone_sales[zid]["categories"].add(row["product_category"])

    for zid in zone_sales:
        zone_sales[zid]["total_revenue"] = round(zone_sales[zid]["total_revenue"], 2)
        zone_sales[zid]["avg_ticket_value"] = round(
            zone_sales[zid]["total_revenue"] / max(1, zone_sales[zid]["transaction_count"]), 2
        )
        zone_sales[zid]["categories"] = list(zone_sales[zid]["categories"])

    return zone_sales


def compute_sales_conversion(zone_analytics, zone_sales):
    """
    Constructs the footfall-to-sales correlation and conversion engine. (Issue #36)
    
    Conversion Rate (%) = (Transactions / Zone Footfall) * 100
    Revenue Per Shopper ($) = Total Revenue / Zone Footfall
    """
    zones_metrics = zone_analytics.get("zones", [])
    conversion_results = []

    for z_metric in zones_metrics:
        zid = z_metric["zone_id"]
        footfall = z_metric["footfall_count"]
        sales_data = zone_sales.get(zid, {
            "total_revenue": 0.0,
            "transaction_count": 0,
            "avg_ticket_value": 0.0
        })

        tx_count = sales_data["transaction_count"]
        revenue = sales_data["total_revenue"]

        conversion_rate = round((tx_count / max(1, footfall)) * 100, 2)
        rev_per_shopper = round(revenue / max(1, footfall), 2)

        conversion_results.append({
            "zone_id": zid,
            "name": z_metric["name"],
            "category": z_metric["category"],
            "footfall_count": footfall,
            "avg_dwell_seconds": z_metric["avg_dwell_seconds"],
            "transactions": tx_count,
            "total_revenue": revenue,
            "conversion_rate_pct": conversion_rate,
            "revenue_per_shopper": rev_per_shopper
        })

    return conversion_results


def detect_lost_sales(conversion_results):
    """
    Implements the Lost Sales Detection Heuristic Algorithm. (Issue #37)
    
    Identifies zones with high footfall/dwell interest but disproportionately low sales conversion,
    quantifying estimated annual lost revenue.
    """
    lost_sales_alerts = []

    for item in conversion_results:
        footfall = item["footfall_count"]
        dwell = item["avg_dwell_seconds"]
        conv_rate = item["conversion_rate_pct"]
        category = item["category"]

        # Ignore checkout counters for lost sales heuristics
        if category == "POS":
            continue

        # Lost sales heuristic: High engagement (> 30s dwell & footfall > 20) but low conversion (< 5%)
        if footfall > 20 and dwell >= 30.0 and conv_rate < 5.0:
            estimated_lost_tx = int(footfall * 0.15) - item["transactions"]
            estimated_lost_revenue = round(max(0, estimated_lost_tx) * 45.0, 2)

            lost_sales_alerts.append({
                "zone_id": item["zone_id"],
                "name": item["name"],
                "footfall": footfall,
                "avg_dwell_seconds": dwell,
                "actual_conversion_rate": conv_rate,
                "benchmark_conversion_rate": 15.0,
                "estimated_lost_revenue_potential": estimated_lost_revenue,
                "root_cause": "High shopper dwell time with low checkout conversion. Check stock availability, pricing, or product accessibility."
            })

    return lost_sales_alerts


def generate_layout_recommendations(conversion_results, lost_sales_alerts):
    """
    Rule-based AI Store Layout Optimization Engine. (Issue #38)
    
    Generates actionable layout & merchandise recommendations to maximize floorplan revenue efficiency.
    """
    recommendations = []

    for alert in lost_sales_alerts:
        recommendations.append({
            "type": "MERCHANDISE_RELOCATION",
            "priority": "HIGH",
            "zone_id": alert["zone_id"],
            "zone_name": alert["name"],
            "action": f"Relocate high-margin impulse items into '{alert['name']}' or improve signage to capture high-dwell shopper traffic.",
            "expected_impact": f"Reclaim up to ${alert['estimated_lost_revenue_potential']:.2f} in unrealized sales."
        })

    # Identify top converting zone
    sorted_conv = sorted(conversion_results, key=lambda x: x["conversion_rate_pct"], reverse=True)
    if sorted_conv:
        top_zone = sorted_conv[0]
        recommendations.append({
            "type": "CAPACITY_EXPANSION",
            "priority": "MEDIUM",
            "zone_id": top_zone["zone_id"],
            "zone_name": top_zone["name"],
            "action": f"Expand product display footprint in '{top_zone['name']}' due to stellar {top_zone['conversion_rate_pct']}% sales conversion rate.",
            "expected_impact": "Increase overall store transaction throughput."
        })

    return recommendations


def compute_layout_efficiency_score(conversion_results, zone_analytics):
    """
    Constructs the Composite Store Floorplan Layout Efficiency Score (0 to 100). (Issue #39)
    
    Calculated from weighted combination of:
    1. Average Conversion Rate Score (40%)
    2. Spatial Traffic Balance Score (30%)
    3. Shopper Engagement Dwell Score (30%)
    """
    if not conversion_results:
        return 50.0

    conv_rates = [item["conversion_rate_pct"] for item in conversion_results]
    avg_conv = np.mean(conv_rates) if conv_rates else 0.0
    conv_score = min(100.0, (avg_conv / 20.0) * 100.0)

    # Traffic distribution balance (lower standard deviation = better balanced store layout)
    traffic_shares = [z.get("traffic_share_pct", 0.0) for z in zone_analytics.get("zones", [])]
    std_dev = np.std(traffic_shares) if traffic_shares else 0.0
    balance_score = max(0.0, 100.0 - (std_dev * 2.5))

    # Engagement score
    dwells = [item["avg_dwell_seconds"] for item in conversion_results]
    avg_dwell = np.mean(dwells) if dwells else 0.0
    engagement_score = min(100.0, (avg_dwell / 45.0) * 100.0)

    # Composite score calculation
    composite_score = round(
        (conv_score * 0.40) + (balance_score * 0.30) + (engagement_score * 0.30), 1
    )

    return {
        "composite_efficiency_score": composite_score,
        "sub_scores": {
            "conversion_performance_score": round(conv_score, 1),
            "traffic_distribution_balance_score": round(balance_score, 1),
            "shopper_engagement_dwell_score": round(engagement_score, 1)
        },
        "grade": "A+" if composite_score >= 85 else "A" if composite_score >= 75 else "B" if composite_score >= 60 else "C"
    }
