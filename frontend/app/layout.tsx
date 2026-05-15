import type { Metadata, Viewport } from "next";
import "./globals.css";
import ToastHost from "@/components/common/ToastHost";
import ErrorBoundary from "@/components/common/ErrorBoundary";

export const metadata: Metadata = {
  title: "EXP Calendar",
  description: "게이미피케이션 기반 일정 관리 시스템",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png"
  }
};

export const viewport: Viewport = {
  themeColor: "#0D1117",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="dark">
      <body className="bg-base text-text-1 antialiased min-h-screen">
        <ErrorBoundary>{children}</ErrorBoundary>
        <ToastHost />
      </body>
    </html>
  );
}
