import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Batch Resize — Creative Export Dashboard",
  description:
    "Upload one master creative and auto-export every required social, display, and print ad size with weight-capped compression and spec-correct file naming.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-canvas font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
