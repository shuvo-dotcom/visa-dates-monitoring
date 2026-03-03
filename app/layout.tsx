import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ireland Immigration Tracker",
  description:
    "Personal dashboard for monitoring Irish visa processing dates (unofficial)",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased dark:bg-gray-950 dark:text-gray-100">
        {children}
      </body>
    </html>
  );
}
