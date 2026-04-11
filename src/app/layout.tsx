import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { getStructuredData } from "./structured-data";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  title: "Avena Terminal — Spain New Build Property Investment Scanner | 1,881 Properties",
  verification: { google: "DGv4LcZcrNU5mn_wXz8-vAErjw0oSxLMN-7KHqdDSd4" },
  description: "Score and rank 1,881 new build properties across Costa Blanca, Costa Cálida and Costa del Sol. Rental yield, price per m², investment score. Spain's first PropTech terminal.",
  metadataBase: new URL("https://avenaterminal.com"),
  alternates: { canonical: 'https://avenaterminal.com' },
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
  keywords: ['Spain new builds', 'Costa Blanca property', 'Costa del Sol investment', 'new build Spain 2026', 'Spanish property investment', 'proptech Spain', 'rental yield Spain', 'Marbella new builds', 'Alicante new builds', 'Costa Calida property', 'Spain investment score'],
  openGraph: {
    title: "Avena Terminal — Spain New Build Property Investment Scanner | 1,881 Properties",
    description: "Score and rank 1,881 new build properties across Costa Blanca, Costa Cálida and Costa del Sol. Rental yield, price per m², investment score.",
    url: "https://avenaterminal.com",
    siteName: "Avena Terminal",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Avena Terminal" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Avena Terminal — Spain New Build Property Investment Scanner",
    description: "Score and rank 1,881 new build properties. Rental yield, investment score, price analysis.",
    images: ["/opengraph-image"],
    site: "@avenaterminal",
    creator: "@henrikkolstad",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
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
        <meta name="robots" content="max-image-preview:large" />
        <meta name="theme-color" content="#0d0d14" />
        <link rel="alternate" hrefLang="en" href="https://avenaterminal.com" />
        <link rel="alternate" hrefLang="es" href="https://avenaterminal.com/es" />
        <link rel="alternate" hrefLang="de" href="https://avenaterminal.com/de" />
        <link rel="alternate" hrefLang="nl" href="https://avenaterminal.com/nl" />
        <link rel="alternate" hrefLang="x-default" href="https://avenaterminal.com" />
        <link rel="preconnect" href="https://apinmo.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://apinmo.com" />
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
