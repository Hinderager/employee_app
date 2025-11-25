"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeftIcon,
  CameraIcon,
  CheckCircleIcon,
  XCircleIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";

interface ReceiptResult {
  success: boolean;
  receipt_id?: string;
  merchant_name?: string;
  amount?: number;
  image_url?: string;
  error?: string;
}

export default function ReceiptsPage() {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<ReceiptResult | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const N8N_WEBHOOK_URL = process.env.NEXT_PUBLIC_RECEIPT_WEBHOOK_URL || "";

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setCapturedImage(base64);
      setResult(null);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!capturedImage) {
      alert("Please take a picture first");
      return;
    }
    if (!N8N_WEBHOOK_URL) {
      alert("Webhook URL not configured. Set NEXT_PUBLIC_RECEIPT_WEBHOOK_URL.");
      return;
    }
    setIsUploading(true);
    setResult(null);
    try {
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: capturedImage,
          filename: "receipt_" + Date.now() + ".jpg",
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to process receipt");
      setResult({
        success: true,
        receipt_id: data.receipt_id,
        merchant_name: data.merchant_name,
        amount: data.amount,
        image_url: data.image_url,
      });
      setCapturedImage(null);
      if (cameraInputRef.current) cameraInputRef.current.value = "";
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : "Failed to process receipt",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setResult(null);
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const handleTakeAnother = () => {
    setResult(null);
    cameraInputRef.current?.click();
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <header className="shadow-sm safe-top" style={{ backgroundColor: "#06649b" }}>
        <div className="px-6 py-4 flex items-center space-x-4">
          <Link href="/home" className="p-2 -ml-2 active:bg-white/10 rounded-lg">
            <ArrowLeftIcon className="h-6 w-6 text-white" />
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white">Receipts</h1>
            <p className="text-sm text-gray-100">Scan and save receipts</p>
          </div>
        </div>
      </header>

      <div className="px-6 py-8 space-y-6">
        {result?.success && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircleIcon className="h-8 w-8 text-green-500" />
              <h2 className="text-lg font-bold text-green-900">Receipt Saved!</h2>
            </div>
            <div className="space-y-2 text-sm text-green-800">
              {result.merchant_name && (
                <p><span className="font-semibold">Merchant:</span> {result.merchant_name}</p>
              )}
              {result.amount !== undefined && (
                <p><span className="font-semibold">Amount:</span> ${result.amount.toFixed(2)}</p>
              )}
              {result.image_url && (
                <a href={result.image_url} target="_blank" rel="noopener noreferrer" className="inline-block mt-2 text-green-700 underline hover:text-green-900">
                  View in Google Drive
                </a>
              )}
            </div>
            <button onClick={handleTakeAnother} className="mt-4 w-full py-3 bg-green-500 text-white rounded-lg font-bold active:scale-95 transition-transform">
              Scan Another Receipt
            </button>
          </div>
        )}

        {result?.success === false && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <XCircleIcon className="h-8 w-8 text-red-500" />
              <h2 className="text-lg font-bold text-red-900">Error Processing Receipt</h2>
            </div>
            <p className="text-sm text-red-800 mb-4">{result.error}</p>
            <button onClick={handleRetake} className="w-full py-3 bg-red-500 text-white rounded-lg font-bold active:scale-95 transition-transform">
              Try Again
            </button>
          </div>
        )}

        {!capturedImage && !result && (
          <div className="flex justify-center">
            <button onClick={() => cameraInputRef.current?.click()} className="bg-amber-500 text-white rounded-2xl shadow-md p-8 transition-transform flex flex-col items-center w-full max-w-md active:scale-95 hover:bg-amber-600">
              <CameraIcon className="h-20 w-20 mb-4" />
              <span className="font-bold text-xl">Take Receipt Photo</span>
              <span className="text-sm mt-2 opacity-90">Tap to open camera</span>
            </button>
          </div>
        )}

        {capturedImage && !result && (
          <div className="bg-white rounded-2xl shadow-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Receipt Preview</h2>
            <div className="relative">
              <img src={capturedImage} alt="Receipt preview" className="w-full rounded-lg border border-gray-200" />
            </div>
            <div className="mt-4 space-y-3">
              <button
                onClick={handleSubmit}
                disabled={isUploading}
                className={`w-full py-4 rounded-lg font-bold text-white flex items-center justify-center gap-2 ${isUploading ? "bg-gray-400 cursor-not-allowed" : "bg-green-500 active:scale-95 transition-transform"}`}
              >
                {isUploading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <DocumentTextIcon className="h-6 w-6" />
                    <span>Scan and Save Receipt</span>
                  </>
                )}
              </button>
              <button onClick={handleRetake} disabled={isUploading} className="w-full py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold active:scale-95 transition-transform disabled:opacity-50">
                Retake Photo
              </button>
            </div>
          </div>
        )}

        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleCapture} className="hidden" />

        {!capturedImage && !result && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
            <h3 className="font-bold text-blue-900 mb-2">How it works:</h3>
            <ol className="list-decimal list-inside text-sm text-blue-800 space-y-2">
              <li>Tap the camera button to take a photo of your receipt</li>
              <li>Review the image and tap Scan and Save</li>
              <li>AI will extract the merchant, date, and amount</li>
              <li>Receipt is saved to Google Drive and logged in the database</li>
            </ol>
          </div>
        )}
      </div>
    </main>
  );
}
