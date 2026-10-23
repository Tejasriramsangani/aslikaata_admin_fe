import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { AdminAuthProvider } from "../context/AdminAuthContext";
import { AdminNavProvider } from "../context/AdminNavContext";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "ASLI KAATA - Operations Cockpit & ERP",
  description: "Enterprise Operations Management, Live Scrap Rates, Fleet Logistics, and Workforce ERP for ASLI KAATA.",
  icons: {
    icon: "/logo.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0A3D2B",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${plusJakartaSans.variable} h-full`}>
      <body className="min-h-full bg-[#F8FAFC] text-slate-900 antialiased selection:bg-emerald-600 selection:text-white">
        <AdminAuthProvider>
          <AdminNavProvider>{children}</AdminNavProvider>
        </AdminAuthProvider>
      </body>
    </html>
  );
}
