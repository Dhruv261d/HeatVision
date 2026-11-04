import React, { useState, useRef, useEffect } from "react";
import {
  UploadCloud,
  Check,
  FileCheck,
  FileSpreadsheet,
  AlertCircle,
  Eye,
  Table as TableIcon,
  X,
  Sparkles,
  Download,
} from "lucide-react";
import {
  getPOSUploads,
  uploadPOSFile,
  getSamplePOSRecords,
  generateSyntheticPOS,
  getSampleCsvDownloadUrl,
} from "../../services/api.js";

export default function PosData({ showToast }) {
  const [uploads, setUploads] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [sampleRecords, setSampleRecords] = useState([]);
  const fileInputRef = useRef(null);

  const loadData = async () => {
    try {
      const data = await getPOSUploads();
      setUploads(data);
      const records = await getSamplePOSRecords();
      setSampleRecords(records);
    } catch (err) {
      console.warn("Could not load initial POS records:", err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = async (file) => {
    // Validate file type
    const validExtensions = [".csv", ".xlsx", ".xls"];
    const isExtensionValid = validExtensions.some((ext) =>
      file.name.toLowerCase().endsWith(ext),
    );

    if (!isExtensionValid) {
      showToast?.("Please upload a valid CSV or XLSX file.", "error");
      return;
    }

    // Validate size (15MB max)
    if (file.size > 15 * 1024 * 1024) {
      showToast?.("File size exceeds 15MB limit.", "error");
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);

    try {
      const result = await uploadPOSFile(file, (progress) => {
        setUploadProgress(progress);
      });

      if (result && result.file) {
        setUploads((prev) => [result.file, ...prev]);
        showToast?.(`Successfully uploaded ${file.name} (${result.count || "processed"} records)`, "success");
        await loadData();
      }
    } catch {
      showToast?.("Failed to upload POS data. Please try again.", "error");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleGenerateSynthetic = async () => {
    setIsGenerating(true);
    try {
      const res = await generateSyntheticPOS(150);
      if (res && res.file) {
        setUploads((prev) => [res.file, ...prev]);
        showToast?.("Generated 150 synthetic transactions for testing!", "success");
        await loadData();
      }
    } catch (err) {
      showToast?.("Failed to generate synthetic data", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn max-w-6xl">
      {/* Page Title & Subtitle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
            Upload POS Data
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Upload store cashier transaction CSVs to calculate zone conversion rates & lost sales
          </p>
        </div>

        {/* Synthetic Generator Button (Issue #34) */}
        <button
          type="button"
          disabled={isGenerating}
          onClick={handleGenerateSynthetic}
          className="inline-flex items-center gap-2 bg-[#f2f8f4] text-[#08764e] hover:bg-[#e4f2e9] border border-[#a1c9b3] px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer disabled:opacity-50 self-start sm:self-auto shadow-xs"
        >
          <Sparkles size={16} className={isGenerating ? "animate-spin" : ""} />
          <span>{isGenerating ? "Generating Dataset..." : "Generate Synthetic POS Data"}</span>
        </button>
      </div>

      {/* Top Grid: Upload Box + File Requirements */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Upload POS Data Card (col-span-8) */}
        <div className="lg:col-span-7 xl:col-span-8 rounded-2xl border border-gray-100 bg-white p-6 shadow-xs flex flex-col justify-between">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            Upload POS Data
          </h2>

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-8 sm:p-10 flex flex-col items-center justify-center text-center transition-all ${
              isDragging
                ? "border-[#08764e] bg-[#f2f8f4]"
                : "border-[#a1c9b3] bg-[#fbfdfc] hover:bg-white"
            }`}
          >
            {/* Hidden native input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={handleFileChange}
            />

            {/* Cloud Icon */}
            <div className="text-[#08764e] mb-3">
              <UploadCloud size={46} strokeWidth={1.8} />
            </div>

            <p className="text-base font-bold text-gray-900">
              Drag & drop your file here
            </p>

            <span className="text-xs text-gray-400 my-2">or</span>

            <button
              type="button"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="bg-[#08764e] hover:bg-[#065e3e] active:scale-98 text-white px-7 py-2.5 rounded-lg text-sm font-semibold transition shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isUploading ? `Uploading (${uploadProgress}%)` : "Choose File"}
            </button>

            {isUploading && (
              <div className="w-full max-w-xs mt-4">
                <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-[#08764e] h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            <p className="text-xs text-gray-400 mt-4">
              Supported formats: CSV, XLSX (Max 15MB)
            </p>
          </div>
        </div>

        {/* File Requirements Card (col-span-4) */}
        <div className="lg:col-span-5 xl:col-span-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-xs flex flex-col">
          <h2 className="text-base font-semibold text-gray-900 pb-3 border-b border-gray-100">
            File Requirements
          </h2>

          <div className="space-y-4 mt-5">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-[#e8f5ee] text-[#08764e] flex items-center justify-center shrink-0 mt-0.5">
                <Check size={13} strokeWidth={3} />
              </div>
              <p className="text-sm text-gray-700 leading-tight">
                CSV or XLSX format
              </p>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-[#e8f5ee] text-[#08764e] flex items-center justify-center shrink-0 mt-0.5">
                <Check size={13} strokeWidth={3} />
              </div>
              <p className="text-sm text-gray-700 leading-tight">
                Include transaction_id, timestamp, zone_id, quantity, price
              </p>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-[#e8f5ee] text-[#08764e] flex items-center justify-center shrink-0 mt-0.5">
                <Check size={13} strokeWidth={3} />
              </div>
              <p className="text-sm text-gray-700 leading-tight">
                Max file size: 15MB
              </p>
            </div>
          </div>

          <div className="mt-auto pt-6 space-y-2">
            <a
              href={getSampleCsvDownloadUrl()}
              download="sample_pos_template.csv"
              className="w-full flex items-center justify-center gap-2 py-2 px-4 text-xs font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition"
            >
              <Download size={14} />
              <span>Download CSV Template</span>
            </a>

            <button
              onClick={() => setShowPreviewModal(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold text-[#08764e] bg-[#f2f8f4] hover:bg-[#e4f2e9] border border-[#a1c9b3]/50 rounded-xl transition cursor-pointer"
            >
              <TableIcon size={14} />
              <span>Preview Required Schema & Records</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Section: Recent Uploads */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">
            Recent Uploads
          </h2>
          <span className="text-xs text-gray-400">
            {uploads.length} files processed
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f2f8f4] text-gray-600 text-xs font-semibold rounded-lg">
                <th className="py-3 px-4 rounded-l-lg">File Name</th>
                <th className="py-3 px-4">Uploaded On</th>
                <th className="py-3 px-4">Records</th>
                <th className="py-3 px-4 rounded-r-lg">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {uploads.map((upload) => (
                <tr key={upload.id} className="hover:bg-gray-50/60 transition">
                  <td className="py-3.5 px-4 font-bold text-gray-900 flex items-center gap-2">
                    <FileSpreadsheet
                      size={16}
                      className="text-gray-400 shrink-0"
                    />
                    <span>{upload.fileName}</span>
                  </td>
                  <td className="py-3.5 px-4 text-gray-600">
                    {upload.uploadedOn}
                  </td>
                  <td className="py-3.5 px-4 text-gray-600 font-medium">
                    {upload.recordsCount || upload.count || "—"} txns
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-[#08764e]">
                        {upload.progress || 100}%
                      </span>
                      <div className="flex items-center gap-1.5 text-[#08764e] font-semibold text-xs">
                        <span className="w-4 h-4 rounded bg-[#e8f5ee] flex items-center justify-center">
                          <Check size={11} strokeWidth={3} />
                        </span>
                        <span>{upload.status || "Completed"}</span>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sample Schema Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-xl border border-gray-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  POS Data Schema & Sample Records
                </h3>
                <p className="text-xs text-gray-500">
                  Required columns: transaction_id, timestamp, zone_id, product_category, item_name, quantity, total_amount
                </p>
              </div>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X size={20} />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#f2f8f4] text-gray-700 font-semibold">
                    <th className="p-2.5">Tx ID</th>
                    <th className="p-2.5">Date</th>
                    <th className="p-2.5">Time</th>
                    <th className="p-2.5">Product</th>
                    <th className="p-2.5">Category</th>
                    <th className="p-2.5">Zone</th>
                    <th className="p-2.5">Qty</th>
                    <th className="p-2.5">Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sampleRecords.map((rec, i) => (
                    <tr key={rec.id || i} className="hover:bg-gray-50">
                      <td className="p-2.5 font-mono text-gray-500">
                        {rec.id || rec.transactionId}
                      </td>
                      <td className="p-2.5">{rec.date}</td>
                      <td className="p-2.5">{rec.time}</td>
                      <td className="p-2.5 font-medium text-gray-900">
                        {rec.product || rec.itemName}
                      </td>
                      <td className="p-2.5 text-gray-600">
                        {rec.category || rec.productCategory}
                      </td>
                      <td className="p-2.5 font-semibold text-[#08764e]">
                        {rec.zone || rec.zoneName}
                      </td>
                      <td className="p-2.5">{rec.quantity}</td>
                      <td className="p-2.5 font-bold">₹{rec.price || rec.totalAmount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-2 flex justify-between items-center">
              <a
                href={getSampleCsvDownloadUrl()}
                download="sample_pos_template.csv"
                className="flex items-center gap-1.5 text-xs text-[#08764e] font-semibold hover:underline"
              >
                <Download size={14} />
                <span>Download Sample CSV Template</span>
              </a>

              <button
                onClick={() => setShowPreviewModal(false)}
                className="px-4 py-2 bg-[#08764e] text-white text-xs font-semibold rounded-lg hover:bg-[#065e3e]"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
