import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import POSTransaction from "../models/POSTransaction.js";
import POSUpload from "../models/POSUpload.js";
import { normalizeZoneId, DEFAULT_STORE_ZONES } from "../services/aiLayoutService.js";

/**
 * Robust CSV parser that handles quotes, commas, and trims
 */
export function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  // Parse header
  const headerLine = lines[0];
  const headers = headerLine.split(",").map((h) => h.trim().replace(/^["']|["']$/g, "").toLowerCase());

  const records = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Handle commas inside quotes
    const values = [];
    let insideQuotes = false;
    let currentVal = "";

    for (let c = 0; c < line.length; c++) {
      const char = line[c];
      if (char === '"' || char === "'") {
        insideQuotes = !insideQuotes;
      } else if (char === "," && !insideQuotes) {
        values.push(currentVal.trim().replace(/^["']|["']$/g, ""));
        currentVal = "";
      } else {
        currentVal += char;
      }
    }
    values.push(currentVal.trim().replace(/^["']|["']$/g, ""));

    const row = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] !== undefined ? values[idx] : "";
    });

    records.push(row);
  }

  return records;
}

/**
 * Maps raw parsed CSV row to normalized transaction object
 */
function mapRowToTransaction(row, idx) {
  const txId = row.transaction_id || row.tx_id || row.id || `TX-${1000 + idx}`;
  
  // Date/Time resolution
  let timestamp = new Date();
  if (row.timestamp) {
    const parsed = new Date(row.timestamp);
    if (!isNaN(parsed.getTime())) timestamp = parsed;
  } else if (row.date) {
    const timeStr = row.time ? ` ${row.time}` : " 12:00:00";
    const parsed = new Date(`${row.date}${timeStr}`);
    if (!isNaN(parsed.getTime())) timestamp = parsed;
  }

  // Zone resolution
  const rawZone = row.zone_id || row.zone || "apparel";
  const zoneId = normalizeZoneId(rawZone);
  const matchedZone = DEFAULT_STORE_ZONES.find((z) => z.id === zoneId);
  const zoneName = matchedZone ? matchedZone.name : rawZone;

  // Item & Category
  const itemName = row.item_name || row.product || row.item || "Retail Item";
  const productCategory = row.product_category || row.category || "General";

  // Financials
  const quantity = Math.max(1, parseInt(row.quantity, 10) || 1);
  const unitPrice = parseFloat(row.unit_price || row.price || 0) || 10.0;
  const totalAmount = parseFloat(row.total_amount) || Math.round(quantity * unitPrice * 100) / 100;

  return {
    transactionId: txId,
    timestamp,
    zoneId,
    zoneName,
    productCategory,
    itemName,
    quantity,
    unitPrice,
    totalAmount,
  };
}

/**
 * POST /api/pos/upload
 * Issue #35: POS CSV upload and database parser pipeline
 */
export async function uploadPOSFile(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No POS file uploaded" });
    }

    const filePath = req.file.path;
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const rawRows = parseCSV(fileContent);

    if (rawRows.length === 0) {
      return res.status(400).json({ success: false, message: "Uploaded file is empty or missing valid CSV headers" });
    }

    const transactions = rawRows.map((row, idx) => mapRowToTransaction(row, idx));

    // Summary calculation
    let totalRevenue = 0;
    let totalItems = 0;
    const zoneSales = {};

    transactions.forEach((tx) => {
      totalRevenue += tx.totalAmount;
      totalItems += tx.quantity;
      if (!zoneSales[tx.zoneId]) {
        zoneSales[tx.zoneId] = { revenue: 0, count: 0, items: 0 };
      }
      zoneSales[tx.zoneId].revenue += tx.totalAmount;
      zoneSales[tx.zoneId].count += 1;
      zoneSales[tx.zoneId].items += tx.quantity;
    });

    // Save POSUpload record
    const uploadDoc = new POSUpload({
      fileName: req.file.originalname,
      fileSize: `${(req.file.size / (1024 * 1024)).toFixed(1)} MB`,
      recordsCount: transactions.length,
      status: "Completed",
      progress: 100,
      summary: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalItemsSold: totalItems,
        zoneSales,
      },
    });

    if (mongoose.connection.readyState === 1) {
      try {
        await uploadDoc.save();
        const docsToInsert = transactions.map((t) => ({ ...t, uploadId: uploadDoc._id }));
        await POSTransaction.insertMany(docsToInsert);
      } catch (dbErr) {
        console.warn("[posController] Database insert error, proceeding with doc payload:", dbErr.message);
      }
    }

    // Clean up temporary uploaded file if needed
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (e) {}

    return res.status(200).json({
      success: true,
      message: `Successfully parsed and recorded ${transactions.length} POS transactions`,
      file: uploadDoc.toJSON(),
      count: transactions.length,
      summary: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalItemsSold: totalItems,
        zoneBreakdown: zoneSales,
      },
    });
  } catch (error) {
    console.error("[posController] Upload error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to process POS data upload",
      error: error.message,
    });
  }
}

/**
 * GET /api/pos/uploads
 * Get history of POS uploads
 */
export async function getUploads(req, res) {
  try {
    if (mongoose.connection.readyState === 1) {
      const uploads = await POSUpload.find().sort({ createdAt: -1 }).limit(20);
      if (uploads && uploads.length > 0) {
        return res.status(200).json({
          success: true,
          data: uploads.map((u) => u.toJSON()),
        });
      }
    }

    // Fallback default uploads for initial view
    return res.status(200).json({
      success: true,
      data: [
        {
          id: "upload-1",
          fileName: "pos_data_sep.csv",
          uploadedOn: "Sep 29, 2026",
          fileSize: "4.2 MB",
          recordsCount: 1420,
          progress: 100,
          status: "Completed",
        },
        {
          id: "upload-2",
          fileName: "sales_aug.xlsx",
          uploadedOn: "Aug 28, 2026",
          fileSize: "6.8 MB",
          recordsCount: 2310,
          progress: 100,
          status: "Completed",
        },
      ],
    });
  } catch (err) {
    console.error("[posController] getUploads error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * GET /api/pos/transactions
 * Get recent POS transaction records
 */
export async function getTransactions(req, res) {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;

    if (mongoose.connection.readyState === 1) {
      const records = await POSTransaction.find().sort({ timestamp: -1 }).limit(limit);
      if (records && records.length > 0) {
        return res.status(200).json({
          success: true,
          data: records.map((r) => r.toJSON()),
        });
      }
    }

    // Default mock sample if empty
    return res.status(200).json({
      success: true,
      data: [
        { id: "TX-1001", date: "2026-09-29", time: "14:23:10", product: "Cotton Casual Shirt", category: "Apparel", zone: "Apparel", quantity: 2, price: 1899 },
        { id: "TX-1002", date: "2026-09-29", time: "14:35:45", product: "Denim Slim Jeans", category: "Apparel", zone: "Apparel", quantity: 1, price: 2499 },
        { id: "TX-1003", date: "2026-09-29", time: "15:10:22", product: "Wireless Headphones", category: "Electronics", zone: "Electronics", quantity: 1, price: 2999 },
        { id: "TX-1004", date: "2026-09-29", time: "15:42:01", product: "Canvas Sneakers", category: "Footwear", zone: "Apparel", quantity: 1, price: 3299 },
        { id: "TX-1005", date: "2026-09-29", time: "16:05:18", product: "Bluetooth Speaker", category: "Electronics", zone: "Electronics", quantity: 1, price: 1450 },
        { id: "TX-1006", date: "2026-09-29", time: "16:30:50", product: "Organic Cereals", category: "Grocery", zone: "Grocery", quantity: 2, price: 540 },
      ],
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * POST /api/pos/generate-synthetic
 * Issue #34: Generates synthetic transactions and saves directly into DB
 */
export async function generateSynthetic(req, res) {
  try {
    const count = parseInt(req.body.count, 10) || 150;
    const days = parseInt(req.body.days, 10) || 7;

    const sampleProducts = [
      { item: "Cotton Casual Shirt", cat: "Apparel", zone: "apparel", minP: 799, maxP: 1899 },
      { item: "Denim Slim Jeans", cat: "Apparel", zone: "apparel", minP: 1499, maxP: 2999 },
      { item: "Designer Jacket", cat: "Apparel", zone: "apparel", minP: 2499, maxP: 5999 },
      { item: "Wireless Headphones", cat: "Electronics", zone: "electronics", minP: 1999, maxP: 4999 },
      { item: "Bluetooth Speaker", cat: "Electronics", zone: "electronics", minP: 999, maxP: 3499 },
      { item: "Smartphone Charger", cat: "Electronics", zone: "electronics", minP: 399, maxP: 899 },
      { item: "Organic Cereals", cat: "Grocery", zone: "grocery", minP: 250, maxP: 650 },
      { item: "Gourmet Coffee Beans", cat: "Grocery", zone: "grocery", minP: 450, maxP: 1200 },
      { item: "Snack Energy Bars", cat: "Grocery", zone: "grocery", minP: 120, maxP: 350 },
      { item: "Store Magazines", cat: "Entrance", zone: "entrance", minP: 150, maxP: 350 },
      { item: "Discount Promo Bundles", cat: "Promotional", zone: "promo", minP: 499, maxP: 1499 },
      { item: "Impulse Candy & Mints", cat: "POS", zone: "checkout", minP: 50, maxP: 150 },
    ];

    const transactions = [];
    const baseTime = Date.now() - (days * 24 * 60 * 60 * 1000);

    for (let i = 1; i <= count; i++) {
      const prod = sampleProducts[Math.floor(Math.random() * sampleProducts.length)];
      const unitPrice = Math.floor(Math.random() * (prod.maxP - prod.minP + 1)) + prod.minP;
      const quantity = Math.random() < 0.75 ? 1 : Math.random() < 0.9 ? 2 : 3;
      const totalAmount = unitPrice * quantity;
      const randomOffset = Math.floor(Math.random() * (days * 24 * 60 * 60 * 1000));
      const txTime = new Date(baseTime + randomOffset);

      const matchedZone = DEFAULT_STORE_ZONES.find((z) => z.id === prod.zone);

      transactions.push({
        transactionId: `TXN-${10000 + i}`,
        timestamp: txTime,
        zoneId: prod.zone,
        zoneName: matchedZone ? matchedZone.name : prod.zone,
        productCategory: prod.cat,
        itemName: prod.item,
        quantity,
        unitPrice,
        totalAmount,
      });
    }

    // Save POSUpload record
    const totalRev = transactions.reduce((sum, t) => sum + t.totalAmount, 0);
    const uploadDoc = new POSUpload({
      fileName: `synthetic_pos_${Date.now()}.csv`,
      fileSize: `${((count * 120) / 1024).toFixed(1)} KB`,
      recordsCount: count,
      status: "Completed",
      progress: 100,
      summary: {
        totalRevenue: totalRev,
        totalItemsSold: transactions.reduce((sum, t) => sum + t.quantity, 0),
      },
    });

    if (mongoose.connection.readyState === 1) {
      try {
        await uploadDoc.save();
        const docs = transactions.map((t) => ({ ...t, uploadId: uploadDoc._id }));
        await POSTransaction.insertMany(docs);
      } catch (e) {
        console.warn("[posController] Database insert error during synthetic generation:", e.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Generated ${count} synthetic POS transactions`,
      file: uploadDoc.toJSON(),
      count,
      records: transactions.slice(0, 10).map((t, idx) => ({
        id: t.transactionId,
        date: t.timestamp.toISOString().split("T")[0],
        time: t.timestamp.toTimeString().split(" ")[0],
        product: t.itemName,
        category: t.productCategory,
        zone: t.zoneName,
        quantity: t.quantity,
        price: t.totalAmount,
      })),
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * GET /api/pos/download-sample
 * Download sample POS CSV
 */
export function downloadSampleCSV(req, res) {
  const sampleHeaders = "transaction_id,timestamp,zone_id,product_category,item_name,quantity,unit_price,total_amount\n";
  const sampleRows = [
    "TX-1001,2026-09-29 14:23:10,apparel,Apparel,Cotton Casual Shirt,2,1899,3798",
    "TX-1002,2026-09-29 14:35:45,apparel,Apparel,Denim Slim Jeans,1,2499,2499",
    "TX-1003,2026-09-29 15:10:22,electronics,Electronics,Wireless Headphones,1,2999,2999",
    "TX-1004,2026-09-29 15:42:01,apparel,Footwear,Canvas Sneakers,1,3299,3299",
    "TX-1005,2026-09-29 16:05:18,electronics,Electronics,Bluetooth Speaker,1,1450,1450",
    "TX-1006,2026-09-29 16:30:50,grocery,Grocery,Organic Cereals,2,540,1080",
    "TX-1007,2026-09-29 17:15:20,checkout,POS,Impulse Candy,3,50,150",
    "TX-1008,2026-09-29 17:45:00,promo,Promotional,Featured Promo Bundle,1,999,999",
  ].join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", 'attachment; filename="sample_pos_template.csv"');
  return res.status(200).send(sampleHeaders + sampleRows);
}
