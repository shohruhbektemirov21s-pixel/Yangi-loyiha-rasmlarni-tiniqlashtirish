import type { Metadata } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";

import { AuthProvider } from "@/components/auth/AuthProvider";
import { AppHeader } from "@/components/layout/AppHeader";
import { ToastProvider } from "@/components/ui/toast/ToastProvider";

import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap"
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap"
});

export const metadata: Metadata = {
  title: "ImageClear AI | Blur Restoration & OCR",
  description:
    "Enhance blurry photos, screenshots, and documents while improving text readability and extracting OCR text."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${jakarta.variable} ${fraunces.variable} min-h-screen`}>
        <AuthProvider>
          <ToastProvider>
            <AppHeader />
            {children}
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
