"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HomeIcon,
  CalendarDaysIcon,
  ClockIcon,
  UserGroupIcon,
  ClipboardDocumentCheckIcon,
  CalendarIcon,
  SunIcon,
  Cog6ToothIcon,
  Bars3Icon,
  XMarkIcon,
  ChevronLeftIcon,
} from "@heroicons/react/24/outline";

const navItems = [
  {
    name: "Dashboard",
    href: "/homebase",
    icon: HomeIcon,
  },
  {
    name: "Schedule",
    href: "/homebase/schedule",
    icon: CalendarDaysIcon,
  },
  {
    name: "Timesheets",
    href: "/homebase/timesheets",
    icon: ClockIcon,
  },
  {
    name: "Team",
    href: "/homebase/team",
    icon: UserGroupIcon,
  },
  {
    name: "Time Clock",
    href: "/homebase/clock",
    icon: ClipboardDocumentCheckIcon,
  },
  {
    name: "My Schedule",
    href: "/homebase/my-schedule",
    icon: CalendarIcon,
  },
  {
    name: "Time Off",
    href: "/homebase/time-off",
    icon: SunIcon,
  },
];

export default function HomebaseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const isActive = (href: string) => {
    if (href === "/homebase") {
      return pathname === "/homebase";
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full z-50
          bg-[#3D2B1F] text-white
          transition-all duration-300 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
          ${sidebarCollapsed ? "lg:w-16" : "lg:w-56"}
        `}
      >
        {/* Logo / Brand */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-white/10">
          {!sidebarCollapsed && (
            <Link href="/homebase" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-[#FFC845] rounded-lg flex items-center justify-center">
                <CalendarDaysIcon className="w-5 h-5 text-[#3D2B1F]" />
              </div>
              <span className="font-bold text-lg">Homebase</span>
            </Link>
          )}
          {sidebarCollapsed && (
            <Link href="/homebase" className="mx-auto">
              <div className="w-8 h-8 bg-[#FFC845] rounded-lg flex items-center justify-center">
                <CalendarDaysIcon className="w-5 h-5 text-[#3D2B1F]" />
              </div>
            </Link>
          )}

          {/* Mobile close button */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 hover:bg-white/10 rounded"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center px-3 py-2.5 rounded-lg
                  transition-colors duration-200
                  ${active
                    ? "bg-[#FFC845] text-[#3D2B1F] font-semibold"
                    : "text-white/80 hover:bg-white/10 hover:text-white"
                  }
                  ${sidebarCollapsed ? "justify-center" : ""}
                `}
                title={sidebarCollapsed ? item.name : undefined}
              >
                <item.icon className={`w-5 h-5 flex-shrink-0 ${active ? "" : ""}`} />
                {!sidebarCollapsed && (
                  <span className="ml-3">{item.name}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Settings & Collapse */}
        <div className="border-t border-white/10 p-2 space-y-1">
          <Link
            href="/homebase/settings"
            className={`
              flex items-center px-3 py-2.5 rounded-lg
              text-white/80 hover:bg-white/10 hover:text-white
              transition-colors duration-200
              ${sidebarCollapsed ? "justify-center" : ""}
            `}
            title={sidebarCollapsed ? "Settings" : undefined}
          >
            <Cog6ToothIcon className="w-5 h-5 flex-shrink-0" />
            {!sidebarCollapsed && <span className="ml-3">Settings</span>}
          </Link>

          {/* Collapse toggle (desktop only) */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={`
              hidden lg:flex items-center px-3 py-2.5 rounded-lg w-full
              text-white/60 hover:bg-white/10 hover:text-white/80
              transition-colors duration-200
              ${sidebarCollapsed ? "justify-center" : ""}
            `}
            title={sidebarCollapsed ? "Expand" : "Collapse"}
          >
            <ChevronLeftIcon
              className={`w-5 h-5 flex-shrink-0 transition-transform duration-200 ${
                sidebarCollapsed ? "rotate-180" : ""
              }`}
            />
            {!sidebarCollapsed && <span className="ml-3">Collapse Menu</span>}
          </button>

          {/* Back to Employee Portal */}
          <Link
            href="/home"
            className={`
              flex items-center px-3 py-2.5 rounded-lg
              text-white/60 hover:bg-white/10 hover:text-white/80
              transition-colors duration-200
              ${sidebarCollapsed ? "justify-center" : ""}
            `}
            title={sidebarCollapsed ? "Back to Portal" : undefined}
          >
            <ChevronLeftIcon className="w-5 h-5 flex-shrink-0" />
            {!sidebarCollapsed && <span className="ml-3">Back to Portal</span>}
          </Link>
        </div>
      </aside>

      {/* Main content area */}
      <div
        className={`
          min-h-screen transition-all duration-300
          lg:ml-56
          ${sidebarCollapsed ? "lg:ml-16" : "lg:ml-56"}
        `}
      >
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-30 bg-[#3D2B1F] safe-top">
          <div className="flex items-center justify-between h-14 px-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 -ml-2 text-white hover:bg-white/10 rounded-lg"
            >
              <Bars3Icon className="w-6 h-6" />
            </button>
            <Link href="/homebase" className="flex items-center space-x-2">
              <div className="w-7 h-7 bg-[#FFC845] rounded-lg flex items-center justify-center">
                <CalendarDaysIcon className="w-4 h-4 text-[#3D2B1F]" />
              </div>
              <span className="font-bold text-white">Homebase</span>
            </Link>
            <div className="w-10" /> {/* Spacer for centering */}
          </div>
        </header>

        {/* Page content */}
        <main className="min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
}
