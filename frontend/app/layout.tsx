import "./globals.css";

import type { Metadata } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";

import { AuthProvider } from "@/components/auth/AuthProvider";
import { AppHeader } from "@/components/layout/AppHeader";
import { ToastProvider } from "@/components/ui/toast/ToastProvider";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
  adjustFontFallback: true
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  fallback: ["Georgia", "Times New Roman", "serif"],
  adjustFontFallback: true
});

function metadataBaseIfValid(): Pick<Metadata, "metadataBase"> | Record<string, never> {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) {
    return {};
  }
  try {
    return { metadataBase: new URL(raw) };
  } catch {
    return {};
  }
}

export const metadata: Metadata = {
  ...metadataBaseIfValid(),
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
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${jakarta.variable} ${fraunces.variable} min-h-screen font-sans antialiased text-slate-900`}
      >
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
