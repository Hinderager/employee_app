"use client";

import Link from "next/link";
import { ArrowLeftIcon, PhotoIcon, BriefcaseIcon } from "@heroicons/react/24/outline";

export default function PicturesPage() {
  const mediaOptions = [
    {
      title: "General Media",
      description: "Company photos and general media",
      href: "/pictures/general-media",
      icon: PhotoIcon,
      color: "bg-purple-500",
    },
    {
      title: "Job-Specific Media",
      description: "Photos for specific jobs",
      href: "/pictures/job-specific-media",
      icon: BriefcaseIcon,
      color: "bg-blue-500",
    },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <header className="shadow-sm safe-top" style={{ backgroundColor: '#06649b' }}>
        <div className="px-6 py-4 flex items-center space-x-4">
          <Link href="/home" className="p-2 -ml-2 active:bg-white/10 rounded-lg">
            <ArrowLeftIcon className="h-6 w-6 text-white" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white">Pictures</h1>
            <p className="text-sm text-gray-100">Select media type</p>
          </div>
        </div>
      </header>

      <div className="px-6 py-8">
        <div className="grid grid-cols-2 gap-4">
          {mediaOptions.map((option) => (
            <Link
              key={option.href}
              href={option.href}
              className="bg-white rounded-2xl shadow-md p-6 active:scale-95 transition-transform flex flex-col items-center text-center"
            >
              <div className={`${option.color} p-4 rounded-xl mb-4`}>
                <option.icon className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                {option.title}
              </h3>
              <p className="text-xs text-gray-600">{option.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
