import os
import csv
import random
from datetime import datetime, timedelta

def generate_synthetic_pos_csv(output_path, num_transactions=200, days=1):
    """
    Generates synthetic POS transaction dataset CSV for testing sales conversion engines. (Issue #34)
    """
    zones = ["zone_entrance", "zone_apparel", "zone_electronics", "zone_checkout"]
    categories = {
        "zone_entrance": ["Snacks & Drinks", "Store Magazines"],
        "zone_apparel": ["Denim Jeans", "Cotton T-Shirts", "Designer Jackets", "Footwear"],
        "zone_electronics": ["Wireless Headphones", "Smartphones", "Bluetooth Speakers", "Accessories"],
        "zone_checkout": ["Impulse Candy", "Batteries", "Gift Cards"]
    }
    
    price_ranges = {
        "Snacks & Drinks": (2.0, 5.0),
        "Store Magazines": (5.0, 12.0),
        "Denim Jeans": (45.0, 95.0),
        "Cotton T-Shirts": (18.0, 35.0),
        "Designer Jackets": (110.0, 250.0),
        "Footwear": (60.0, 140.0),
        "Wireless Headphones": (80.0, 220.0),
        "Smartphones": (400.0, 999.0),
        "Bluetooth Speakers": (50.0, 150.0),
        "Accessories": (15.0, 40.0),
        "Impulse Candy": (1.5, 4.0),
        "Batteries": (4.0, 10.0),
        "Gift Cards": (25.0, 100.0)
    }

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
            zone = random.choice(zones)
            category_item = random.choice(categories[zone])
            min_p, max_p = price_ranges[category_item]
            unit_price = round(random.uniform(min_p, max_p), 2)
            quantity = random.choices([1, 2, 3], weights=[0.8, 0.15, 0.05])[0]
            total_amount = round(unit_price * quantity, 2)

            random_minutes = random.randint(0, days * 24 * 60)
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

    return output_path
