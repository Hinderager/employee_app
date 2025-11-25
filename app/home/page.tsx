"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MapPinIcon,
  ShoppingCartIcon,
  CreditCardIcon,
  MapIcon,
  CameraIcon,
  DocumentTextIcon,
  TruckIcon,
  ClipboardDocumentListIcon,
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
    title: "Job Locations",
    description: "View job sites",
    href: "/job-locations",
    icon: MapIcon,
    color: "bg-orange-500",
  },
  {
    title: "Receipts",
    description: "Upload receipts",
    href: "/receipts",
    icon: DocumentTextIcon,
    color: "bg-amber-500",
  },
  {
    title: "Pictures",
    description: "Job photos",
    href: "/pictures",
    icon: CameraIcon,
    color: "bg-pink-500",
  },
  {
    title: "Move Billing",
    description: "Moving supplies charges",
    href: "/move-billing",
    icon: CreditCardIcon,
    color: "bg-purple-500",
  },
  {
    title: "Move Jobs",
    description: "View move jobs",
    href: "/move-jobs",
    icon: ClipboardDocumentListIcon,
    color: "bg-teal-500",
  },
  {
    title: "Move Quote",
    description: "Move work tracking",
    href: "/move-wt",
    icon: TruckIcon,
    color: "bg-red-500",
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
  const router = useRouter();

  // Prefetch page on hover for faster navigation
  const handleMouseEnter = (href: string) => {
    router.prefetch(href);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 safe-bottom">
      {/* Header */}
      <header className="shadow-sm safe-top" style={{ backgroundColor: '#06649b' }}>
        <div className="px-6 py-4 text-center">
          <h1 className="text-lg font-bold text-white">Top Shelf Employee Portal</h1>
        </div>
      </header>

      {/* Main Content */}
      <div className="px-4 py-8">
        <div className="max-w-4xl mx-auto grid grid-cols-2 gap-4">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              onMouseEnter={() => handleMouseEnter(item.href)}
              className="block group"
            >
              <div className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-200 p-6 border border-gray-200 active:scale-98">
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className={`${item.color} p-4 rounded-xl shadow-md`}>
                    <item.icon className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900 group-hover:text-gray-700">
                      {item.title}
                    </h2>
                    <p className="text-xs text-gray-500 mt-1">
                      {item.description}
                    </p>
                  </div>
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
