import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { getStructuredData } from "./structured-data";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  title: "Avena Terminal — Spain New Build Property Investment Scanner | 1,867 Properties",
  verification: { google: "197e3d48f8d51384" },
  description: "Score and rank 1,867 new build properties across Costa Blanca, Costa Cálida and Costa del Sol. Rental yield, price per m², investment score. Spain's first PropTech terminal.",
  metadataBase: new URL("https://avenaterminal.com"),
  keywords: ['Spain new builds', 'Costa Blanca property', 'Costa del Sol investment', 'new build Spain 2026', 'Spanish property investment', 'proptech Spain', 'rental yield Spain', 'Marbella new builds', 'Alicante new builds', 'Costa Calida property', 'Spain investment score'],
  openGraph: {
    title: "Avena Terminal — Spain New Build Property Investment Scanner | 1,867 Properties",
    description: "Score and rank 1,867 new build properties across Costa Blanca, Costa Cálida and Costa del Sol. Rental yield, price per m², investment score.",
    url: "https://avenaterminal.com",
    siteName: "Avena Terminal",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Avena Terminal" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Avena Terminal — Spain New Build Property Investment Scanner",
    description: "Score and rank 1,867 new build properties. Rental yield, investment score, price analysis.",
    images: ["/opengraph-image"],
  },
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
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(getStructuredData()) }}
        />
      </head>
      <body className="bg-gray-950 text-gray-100 antialiased">
        <LanguageProvider><AuthProvider>{children}</AuthProvider></LanguageProvider>
        <Analytics />
      </body>
    </html>
  );
}
