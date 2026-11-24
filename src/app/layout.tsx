import type { Metadata, Viewport } from "next";
import "@fontsource/poppins/400.css";
import "@fontsource/poppins/500.css";
import "@fontsource/poppins/600.css";
import "@fontsource/poppins/700.css";
import "./globals.css";
import { RegisterSW } from "@/components/RegisterSW";

export const metadata: Metadata = {
  title: "NearBasket — groceries from your neighbourhood supermarket",
  description: "Order groceries from supermarkets within 3 km of you and track delivery live.",
  manifest: "/manifest.webmanifest",
  applicationName: "NearBasket",
  appleWebApp: { capable: true, title: "NearBasket", statusBarStyle: "default" },
  icons: { icon: [{ url: "/icons/icon-192.png", sizes: "192x192" }, { url: "/icons/icon.svg", type: "image/svg+xml" }], apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#17633A",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN">
      <body className="min-h-dvh">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2">Skip to content</a>
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
