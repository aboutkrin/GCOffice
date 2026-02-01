import type { Metadata, Viewport } from "next";
import { Sarabun } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const sarabun = Sarabun({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sarabun",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#1a1a1a",
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "GCOffice - ระบบใบเสนอราคา",
  description: "ระบบจัดทำใบเสนอราคาและใบแจ้งหนี้",
  applicationName: "GCOffice",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "GCOffice",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body className={`${sarabun.variable} font-sans antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
