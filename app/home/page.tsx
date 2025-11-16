"use client";

import Link from "next/link";
import {
  MapPinIcon,
  ShoppingCartIcon,
  CreditCardIcon
} from "@heroicons/react/24/outline";

const menuItems = [
  {
    title: "Vehicle Locations",
    description: "GPS Tracker",
    href: "/vehicle-locations",
    icon: MapPinIcon,
    color: "bg-blue-500",
  },
  {
    title: "Billing Supplies",
    description: "Moving supplies charges",
    href: "/billing",
    icon: CreditCardIcon,
    color: "bg-purple-500",
  },
  {
    title: "Order Supplies",
    description: "Request materials",
    href: "/supplies",
    icon: ShoppingCartIcon,
    color: "bg-green-500",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 safe-top safe-bottom">
      {/* Header */}
      <header className="bg-topshelf-yellow shadow-sm">
        <div className="px-6 py-6">
          <h1 className="text-2xl font-bold text-black">Top Shelf</h1>
          <p className="text-sm text-gray-800 mt-1">Employee Portal</p>
        </div>
      </header>

      {/* Main Content */}
      <div className="px-4 py-8">
        <div className="max-w-md mx-auto space-y-4">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block group"
            >
              <div className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-200 p-6 border border-gray-200 active:scale-98">
                <div className="flex items-center space-x-4">
                  <div className={`${item.color} p-4 rounded-xl shadow-md`}>
                    <item.icon className="h-8 w-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-lg font-bold text-gray-900 group-hover:text-gray-700">
                      {item.title}
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                      {item.description}
                    </p>
                  </div>
                  <svg
                    className="h-6 w-6 text-gray-400 group-hover:text-gray-600 transition-colors"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-bottom">
        <div className="px-6 py-4 text-center">
          <p className="text-xs text-gray-500">
            Top Shelf Moving and Junk Removal
          </p>
        </div>
      </footer>
    </main>
  );
}
