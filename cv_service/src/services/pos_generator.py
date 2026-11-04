import os
import csv
import random
import argparse
from datetime import datetime, timedelta

# Standard store zones matching store floorplans and HeatVision pipelines
DEFAULT_STORE_ZONES = ["entrance", "promo", "apparel", "electronics", "grocery", "checkout"]

DEFAULT_CATEGORIES = {
    "entrance": ["Snacks & Drinks", "Store Magazines", "Umbrellas", "Hand Sanitizers"],
    "promo": ["Seasonal Promo Items", "Clearance Apparel", "Featured Bundles", "Discount Accessories"],
    "apparel": ["Denim Jeans", "Cotton T-Shirts", "Designer Jackets", "Footwear", "Silk Blend Scarf"],
    "electronics": ["Wireless Headphones", "Smartphones", "Bluetooth Speakers", "Accessories", "Charging Cables"],
    "grocery": ["Organic Cereals", "Fresh Milk", "Gourmet Coffee", "Artisan Bread", "Snack Bars"],
    "checkout": ["Impulse Candy", "Batteries", "Gift Cards", "Chewing Gum"]
}

PRICE_RANGES = {
    "Snacks & Drinks": (2.0, 5.0),
    "Store Magazines": (5.0, 12.0),
    "Umbrellas": (12.0, 25.0),
    "Hand Sanitizers": (3.0, 8.0),
    "Seasonal Promo Items": (15.0, 45.0),
    "Clearance Apparel": (12.0, 30.0),
    "Featured Bundles": (25.0, 60.0),
    "Discount Accessories": (8.0, 20.0),
    "Denim Jeans": (45.0, 95.0),
    "Cotton T-Shirts": (18.0, 35.0),
    "Designer Jackets": (110.0, 250.0),
    "Footwear": (60.0, 140.0),
    "Silk Blend Scarf": (20.0, 45.0),
    "Wireless Headphones": (80.0, 220.0),
    "Smartphones": (400.0, 999.0),
    "Bluetooth Speakers": (50.0, 150.0),
    "Accessories": (15.0, 40.0),
    "Charging Cables": (10.0, 25.0),
    "Organic Cereals": (4.5, 9.0),
    "Fresh Milk": (3.0, 6.0),
    "Gourmet Coffee": (9.0, 18.0),
    "Artisan Bread": (4.0, 8.0),
    "Snack Bars": (2.5, 6.0),
    "Impulse Candy": (1.5, 4.0),
    "Batteries": (4.0, 10.0),
    "Gift Cards": (25.0, 100.0),
    "Chewing Gum": (1.0, 2.5)
}

def generate_synthetic_pos_csv(output_path, num_transactions=200, days=7, zones=None):
    """
    Generates synthetic POS transaction dataset CSV for testing sales conversion engines. (Issue #34)
    """
    active_zones = zones or DEFAULT_STORE_ZONES
    categories = DEFAULT_CATEGORIES
    price_ranges = PRICE_RANGES

    fieldnames = [
        "transaction_id",
        "timestamp",
        "zone_id",
        "product_category",
        "item_name",
        "quantity",
        "unit_price",
        "total_amount"
    ]

    out_dir = os.path.dirname(output_path)
    if out_dir and not os.path.exists(out_dir):
        os.makedirs(out_dir, exist_ok=True)

    base_time = datetime.now() - timedelta(days=days)

    with open(output_path, 'w', newline='', encoding='utf-8') as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()

        for i in range(1, num_transactions + 1):
            zone = random.choice(active_zones)
            zone_key = zone if zone in categories else "checkout"
            category_item = random.choice(categories.get(zone_key, ["General Merchandise"]))
            
            min_p, max_p = price_ranges.get(category_item, (10.0, 50.0))
            unit_price = round(random.uniform(min_p, max_p), 2)
            quantity = random.choices([1, 2, 3, 4], weights=[0.75, 0.18, 0.05, 0.02])[0]
            total_amount = round(unit_price * quantity, 2)

            random_minutes = random.randint(0, max(1, days * 24 * 60))
            tx_time = (base_time + timedelta(minutes=random_minutes)).strftime("%Y-%m-%d %H:%M:%S")

            writer.writerow({
                "transaction_id": f"TXN-{10000 + i}",
                "timestamp": tx_time,
                "zone_id": zone,
                "product_category": category_item.split()[0],
                "item_name": category_item,
                "quantity": quantity,
                "unit_price": unit_price,
                "total_amount": total_amount
            })

    print(f"[pos_generator] Successfully generated {num_transactions} synthetic POS transactions -> {output_path}")
    return output_path

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Synthetic POS Transaction Dataset Generator (Issue #34)")
    parser.add_argument("--output", "-o", default="data/synthetic_pos.csv", help="Path to output CSV file")
    parser.add_argument("--transactions", "-n", type=int, default=250, help="Number of transactions to generate")
    parser.add_argument("--days", "-d", type=int, default=7, help="Span of days for timestamps")
    args = parser.parse_args()

    generate_synthetic_pos_csv(output_path=args.output, num_transactions=args.transactions, days=args.days)
