import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Session Planner — Dinghy Sailing",
  description: "Organise dinghy sailing sessions and allocate sailors to boats",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 min-h-screen overflow-auto">
        {children}
      </body>
    </html>
  );
}
