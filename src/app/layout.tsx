import type { Metadata } from "next";
import Script from "next/script";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

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
        <Script id="zoho-salesiq-init" strategy="afterInteractive">
          {`window.$zoho=window.$zoho||{};$zoho.salesiq=$zoho.salesiq||{ready:function(){}};`}
        </Script>
        <Script
          id="zsiqscript"
          src="https://salesiq.zohopublic.in/widget?wc=siqb5fa5cb4b302ffb287f47f7ae09dc9a9a2c173abc6a7b5988191264366b2b29f"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
