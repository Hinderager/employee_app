"use client";

import Link from "next/link";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

export default function SuppliesPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <header className="bg-topshelf-yellow shadow-sm">
        <div className="px-6 py-4 flex items-center space-x-4">
          <Link href="/" className="p-2 -ml-2 active:bg-black/10 rounded-lg">
            <ArrowLeftIcon className="h-6 w-6 text-black" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-black">Order Supplies</h1>
            <p className="text-sm text-gray-800">Request materials</p>
          </div>
        </div>
      </header>

      <div className="px-6 py-8">
        <div className="bg-white rounded-2xl shadow-md p-8 text-center">
          <div className="text-6xl mb-4">📦</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Coming Soon</h2>
          <p className="text-gray-600">
            Supply ordering functionality will be available here.
          </p>
        </div>
      </div>
    </main>
  );
}
