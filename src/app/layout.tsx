import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Avena Estate — Spain Property Investment Scanner",
  description:
    "Find the best new-build property deals in Costa Blanca & Costa Cálida. Deal scoring, rental yield analysis, and market comparison.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-gray-100 antialiased">{children}</body>
    </html>
  );
}
