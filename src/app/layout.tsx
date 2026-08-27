import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { SalesIqLoader } from '@/components/SalesIqLoader';

export const metadata: Metadata = {
  title: {
    template: '%s | V-VISA Business',
    default: 'V-VISA Business - Best Prices, Effortless Bookings',
  },
  description: "India's most trusted B2B visa platform for travel agencies. 500,000+ visas delivered. 65 visa types. 5,000+ agents.",
  keywords: ['visa for travel agents', 'b2b visa platform', 'bulk visa applications', 'india visa services'],
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
  openGraph: {
    siteName: 'V-VISA Business',
    locale: 'en_IN',
    title: 'V-VISA Business - Best Prices, Effortless Bookings',
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
        className="antialiased"
        suppressHydrationWarning
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
        <SalesIqLoader />
      </body>
    </html>
  );
}
