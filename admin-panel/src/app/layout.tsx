import type { Metadata } from "next";
import "./globals.css";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import { AppConfigProvider } from "@/context/AppConfigContext";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "RepairShop Admin",
  description: "Admin Panel for RepairShop Service Management System",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/logo.webp",
  },
};

import { ToastProvider } from "@/components/common/ToastProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`h-full antialiased ${inter.variable}`}
    >
      <body className="min-h-full flex flex-col font-sans bg-admin-bg-base text-admin-text-primary">
        <ToastProvider>
          <AuthProvider>
            <AppConfigProvider>
              {children}
            </AppConfigProvider>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
