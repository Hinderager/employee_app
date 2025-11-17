"use client";

import Link from "next/link";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import Image from "next/image";
import { useState } from "react";

// Supply items data
const SUPPLY_ITEMS = [
  { id: 1, name: "X-Large Box", price: 6, image: "/supplies/asset-1.png" },
  { id: 2, name: "Large Box", image: "/supplies/asset-2.png" },
  { id: 3, name: "Medium Box", image: "/supplies/asset-3.png" },
  { id: 4, name: "Small Box", image: "/supplies/asset-4.png" },
  { id: 5, name: "TV Box", image: "/supplies/asset-5.png" },
  { id: 6, name: "5\" x 1,000' Wrap", image: "/supplies/asset-6.png" },
  { id: 7, name: "15\" x 820' Wrap", image: "/supplies/asset-7.png" },
  { id: 8, name: "Moving Pads", image: "/supplies/asset-8.png" },
  { id: 9, name: "Mattress Cover", image: "/supplies/asset-9.png" },
  { id: 10, name: "Sofa Cover", image: "/supplies/asset-10.png" },
  { id: 11, name: "Chair Cover", image: "/supplies/asset-11.png" },
  { id: 12, name: "Bubble Wrap", image: "/supplies/asset-12.png" },
  { id: 13, name: "10lbs Wrapping Paper", image: "/supplies/asset-13.png" },
  { id: 14, name: "Ratchet Strap", image: "/supplies/asset-14.png" },
  { id: 15, name: "24\" x 50' floor runner", image: "/supplies/asset-15.png" },
];

export default function BillingPage() {
  const [selectedItems, setSelectedItems] = useState<{[key: number]: number}>({});

  const handleQuantityChange = (id: number, quantity: number) => {
    if (quantity <= 0) {
      const newItems = { ...selectedItems };
      delete newItems[id];
      setSelectedItems(newItems);
    } else {
      setSelectedItems({ ...selectedItems, [id]: quantity });
    }
  };

  const getTotalItems = () => {
    return Object.values(selectedItems).reduce((sum, qty) => sum + qty, 0);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 pb-20">
      {/* Menu Button - Top Left */}
      <Link
        href="/home"
        className="fixed top-4 left-4 z-[1000] bg-white/90 backdrop-blur-sm hover:bg-white shadow-lg rounded-lg px-4 py-2 flex items-center gap-2 transition-all hover:scale-105"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        <span className="font-medium text-gray-900">Menu</span>
      </Link>

      <div className="px-6 py-6 pt-20">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {SUPPLY_ITEMS.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="relative h-40 bg-white">
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  className="object-contain p-2"
                  quality={100}
                  unoptimized
                />
              </div>
              <div className="p-4 bg-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 text-sm">
                    {item.name}
                  </h3>
                  {item.price && (
                    <span className="font-bold text-gray-900 text-2xl">
                      ${item.price}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleQuantityChange(item.id, (selectedItems[item.id] || 0) - 1)}
                    className="w-8 h-8 rounded-lg bg-gray-200 hover:bg-gray-300 active:bg-gray-400 flex items-center justify-center font-bold text-gray-700"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="0"
                    value={selectedItems[item.id] || 0}
                    onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 0)}
                    className="w-12 h-8 text-center border border-gray-300 rounded-lg font-semibold"
                  />
                  <button
                    onClick={() => handleQuantityChange(item.id, (selectedItems[item.id] || 0) + 1)}
                    className="w-8 h-8 rounded-lg bg-topshelf-yellow hover:bg-yellow-400 active:bg-yellow-500 flex items-center justify-center font-bold"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {getTotalItems() > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg p-4 z-20">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">Total Items</div>
              <div className="text-2xl font-bold text-gray-900">{getTotalItems()}</div>
            </div>
            <button className="bg-topshelf-yellow hover:bg-yellow-400 active:bg-yellow-500 text-black font-bold px-8 py-3 rounded-lg shadow-md transition-colors">
              Add to Bill
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
