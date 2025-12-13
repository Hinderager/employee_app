"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  LockClosedIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline";

const ADMIN_CODE = "0457";

export default function AdminPage() {
  const router = useRouter();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const handleCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code === ADMIN_CODE) {
      setIsUnlocked(true);
      setError("");
    } else {
      setError("Incorrect code");
      setCode("");
    }
  };

  const handleDigitPress = (digit: string) => {
    if (code.length < 4) {
      const newCode = code + digit;
      setCode(newCode);
      setError("");

      // Auto-submit when 4 digits entered
      if (newCode.length === 4) {
        if (newCode === ADMIN_CODE) {
          setIsUnlocked(true);
          setError("");
        } else {
          setError("Incorrect code");
          setCode("");
        }
      }
    }
  };

  const handleBackspace = () => {
    setCode(code.slice(0, -1));
    setError("");
  };

  // Code entry screen
  if (!isUnlocked) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 safe-bottom">
        {/* Header */}
        <header className="shadow-sm safe-top" style={{ backgroundColor: '#06649b' }}>
          <div className="px-4 py-4 flex items-center">
            <button
              onClick={() => router.push("/home")}
              className="p-2 -ml-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <ArrowLeftIcon className="h-6 w-6 text-white" />
            </button>
            <h1 className="text-lg font-bold text-white ml-2">Admin Access</h1>
          </div>
        </header>

        {/* Code Entry */}
        <div className="flex flex-col items-center justify-center px-4 pt-16">
          <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
            <div className="flex justify-center mb-6">
              <div className="bg-gray-100 p-4 rounded-full">
                <LockClosedIcon className="h-12 w-12 text-gray-600" />
              </div>
            </div>

            <h2 className="text-xl font-bold text-center text-gray-900 mb-2">
              Enter Admin Code
            </h2>
            <p className="text-sm text-gray-500 text-center mb-6">
              Enter the 4-digit code to access admin features
            </p>

            {/* Code dots */}
            <div className="flex justify-center gap-4 mb-6">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`w-4 h-4 rounded-full transition-colors ${
                    code.length > i ? "bg-blue-600" : "bg-gray-200"
                  }`}
                />
              ))}
            </div>

            {/* Error message */}
            {error && (
              <p className="text-red-500 text-sm text-center mb-4">{error}</p>
            )}

            {/* Number pad */}
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, "", 0, "⌫"].map((digit, index) => (
                <button
                  key={index}
                  onClick={() => {
                    if (digit === "⌫") {
                      handleBackspace();
                    } else if (digit !== "") {
                      handleDigitPress(String(digit));
                    }
                  }}
                  disabled={digit === ""}
                  className={`h-14 rounded-xl text-xl font-semibold transition-colors ${
                    digit === ""
                      ? "invisible"
                      : digit === "⌫"
                      ? "bg-gray-100 text-gray-600 hover:bg-gray-200 active:bg-gray-300"
                      : "bg-gray-100 text-gray-900 hover:bg-gray-200 active:bg-gray-300"
                  }`}
                >
                  {digit}
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Admin dashboard (unlocked)
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 safe-bottom">
      {/* Header */}
      <header className="shadow-sm safe-top" style={{ backgroundColor: '#06649b' }}>
        <div className="px-4 py-4 flex items-center">
          <button
            onClick={() => router.push("/home")}
            className="p-2 -ml-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <ArrowLeftIcon className="h-6 w-6 text-white" />
          </button>
          <h1 className="text-lg font-bold text-white ml-2">Admin Dashboard</h1>
        </div>
      </header>

      {/* Content */}
      <div className="px-4 py-6">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-indigo-100 p-3 rounded-xl">
              <Cog6ToothIcon className="h-8 w-8 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Admin Panel</h2>
              <p className="text-sm text-gray-500">Manage app settings</p>
            </div>
          </div>

          <div className="border-t pt-4 mt-4">
            <p className="text-gray-600 text-center">
              Admin features coming soon
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
