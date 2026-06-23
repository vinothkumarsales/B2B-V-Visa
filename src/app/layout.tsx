import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    template: '%s | VVisa Business',
    default: 'VVisa Business — Best Prices, Effortless Bookings',
  },
  description: "India's most trusted B2B visa platform for travel agencies. 500,000+ visas delivered. 65 visa types. 5,000+ agents.",
  keywords: ['visa for travel agents', 'b2b visa platform', 'bulk visa applications', 'india visa services'],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    siteName: 'VVisa Business',
    locale: 'en_IN',
    title: 'VVisa Business — Best Prices, Effortless Bookings',
    description: "India's most trusted B2B visa platform for travel agencies.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}