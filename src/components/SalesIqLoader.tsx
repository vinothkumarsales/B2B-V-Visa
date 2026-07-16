'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';

export function SalesIqLoader() {
  const pathname = usePathname();
  if (pathname === '/login' || pathname === '/register') return null;

  return (
    <>
      <Script id="zoho-salesiq-init" strategy="afterInteractive">
        {`window.$zoho=window.$zoho||{};$zoho.salesiq=$zoho.salesiq||{ready:function(){}};`}
      </Script>
      <Script
        id="zsiqscript"
        src="https://salesiq.zohopublic.in/widget?wc=siqb5fa5cb4b302ffb287f47f7ae09dc9a9a2c173abc6a7b5988191264366b2b29f"
        strategy="afterInteractive"
      />
    </>
  );
}
