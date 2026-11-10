import type { Metadata, Viewport } from "next";
import "./globals.css";
import { MotionPreferences } from "../components/ui/MotionPreferences";
import { AdminAuthProvider } from "../context/AdminAuthContext";
import { AdminNavProvider } from "../context/AdminNavContext";


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
  themeColor: "#1B5E3A",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-canvas text-slate-900 antialiased selection:bg-emerald-600 selection:text-white">
        <MotionPreferences>
        <AdminAuthProvider>
          <AdminNavProvider>{children}</AdminNavProvider>
        </AdminAuthProvider>
              </MotionPreferences>
      </body>
    </html>
  );
}
