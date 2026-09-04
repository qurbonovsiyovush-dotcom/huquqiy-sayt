import type { Metadata } from "next";
import {
  Geist,
  Geist_Mono,
} from "next/font/google";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    "https://qurbonovv.uz"
  ),

  title: {
    default:
      "Qurbonov S.J. | Huquqiy ta’lim platformasi",
    template:
      "%s | Qurbonov S.J.",
  },

  description:
    "Qurbonov Siyovush Jamaliddinzodaning huquqiy ta’lim platformasi. Talabalar va abituriyentlar uchun huquqiy materiallar, testlar, kazuslar, kodekslar, qonunchilik hujjatlari va qo‘llanmalar.",

  keywords: [
    "Qurbonov S.J.",
    "Qurbonov Siyovush",
    "Qurbonov Siyovush Jamaliddinzoda",
    "qurbonovv.uz",
    "huquq",
    "huquqiy ta’lim",
    "huquqiy ta’lim platformasi",
    "huquq testlari",
    "yuridik testlar",
    "kodekslar",
    "qonunchilik hujjatlari",
    "kazuslar",
    "huquq qo‘llanmalar",
    "talabalar uchun huquq",
    "abituriyentlar uchun huquq",
    "English Vocabulary",
    "4000 Essential English Words",
  ],

  authors: [
    {
      name:
        "Qurbonov Siyovush Jamaliddinzoda",
    },
  ],

  creator:
    "Qurbonov Siyovush Jamaliddinzoda",

  publisher:
    "Qurbonov Siyovush Jamaliddinzoda",

  alternates: {
    canonical: "/",
  },

  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
  },

  openGraph: {
    type: "website",
    locale: "uz_UZ",
    url: "https://qurbonovv.uz",

    siteName:
      "Qurbonov S.J.",

    title:
      "Qurbonov S.J. | Huquqiy ta’lim platformasi",

    description:
      "Talabalar va abituriyentlar uchun huquqiy materiallar, testlar, kazuslar, kodekslar, qonunchilik hujjatlari va qo‘llanmalar.",
  },

  robots: {
    index: true,
    follow: true,

    googleBot: {
      index: true,
      follow: true,
    },
  },
};

type RootLayoutProps = {
  children: React.ReactNode;
};

export default function RootLayout({
  children,
}: RootLayoutProps) {
  return (
    <html
      lang="uz"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
