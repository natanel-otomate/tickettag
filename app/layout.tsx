import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TicketTag",
  description: "Automatic sequential ID generator for Monday.com boards",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <script
          src="https://cdn.jsdelivr.net/npm/monday-sdk-js/dist/main.js"
          async
        />
      </head>
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}