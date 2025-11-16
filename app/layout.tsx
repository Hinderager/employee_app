import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Top Shelf Employee App",
  description: "Employee tools for Top Shelf Moving and Junk Removal",
  manifest: "/manifest.json",
  themeColor: "#FFC845",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Top Shelf",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50">{children}</body>
    </html>
  );
}
