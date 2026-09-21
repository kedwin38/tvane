import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tidevane — Read the flow. Trade the truth.",
  description:
    "Tidevane is a market-intelligence trading platform. It measures the present state of the market with precision and lets you trade only what has been evidenced.",
  icons: {
    icon: "/brand/tidevane-logo.webp",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-void text-text-1 font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
