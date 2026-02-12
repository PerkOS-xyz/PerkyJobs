import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PerkyJobs — AI Job Marketplace on Celo",
  description: "Post tasks, get matched with verified workers, pay with Celo stablecoins.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
