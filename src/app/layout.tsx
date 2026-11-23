import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import ServiceWorker from "@/components/service-worker";

export const metadata: Metadata = {
  title: "Kotoba | 오늘의 일본어",
  description: "한자와 단어를 연결해서, 매일 조금씩 공부하세요.",
  applicationName: "Kotoba",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Kotoba" },
  icons: { icon: "/icon.svg", apple: { url: "/icons/apple-touch-icon.png", sizes: "180x180" } },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#18352e",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <ServiceWorker />
        {children}
      </body>
    </html>
  );
}
