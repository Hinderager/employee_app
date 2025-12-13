"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  LockClosedIcon,
  ChartBarIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";

const ADMIN_CODE = "0457";

const adminMenuItems = [
  {
    title: "Website Analytics",
    description: "View traffic, conversions, and ad performance",
    href: "/admin/website-analytics",
    icon: ChartBarIcon,
    color: "bg-blue-100",
    iconColor: "text-blue-600",
  },
];

export default function AdminPage() {
  const router = useRouter();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const handleDigitPress = (digit: string) => {
    if (code.length < 4) {
      const newCode = code + digit;
      setCode(newCode);
      setError("");

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

  if (!isUnlocked) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 safe-bottom">
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

            <div className="flex justify-center gap-4 mb-6">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={}
                />
              ))}
            </div>

            {error && (
              <p className="text-red-500 text-sm text-center mb-4">{error}</p>
            )}

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
                  className={}
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

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 safe-bottom">
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

      <div className="px-4 py-6 space-y-4">
        {adminMenuItems.map((item) => (
          <button
            key={item.href}
            onClick={() => router.push(item.href)}
            className="w-full bg-white rounded-2xl shadow-lg p-4 flex items-center gap-4 hover:shadow-xl transition-shadow active:bg-gray-50"
          >
            <div className={}>
              <item.icon className={} />
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-semibold text-gray-900">{item.title}</h3>
              <p className="text-sm text-gray-500">{item.description}</p>
            </div>
            <ChevronRightIcon className="h-5 w-5 text-gray-400" />
          </button>
        ))}
      </div>
    </main>
  );
}
