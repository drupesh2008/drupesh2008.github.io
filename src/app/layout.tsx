import type { Metadata } from "next";
import Script from 'next/script';
import { GA_TRACKING_ID } from '@/lib/gtag';
import Analytics from '@/components/Analytics';
import "./globals.css";

export const metadata: Metadata = {
  title: "D Rupesh Kumar - Portfolio",
  description: "Personal portfolio website showcasing projects and skills",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Google Analytics - only load if tracking ID is available */}
        {GA_TRACKING_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`}
              strategy="afterInteractive"
            />
            <Script id="gtag-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_TRACKING_ID}');
              `}
            </Script>
          </>
        )}
      </head>
      <body>
        <Analytics />
        {children}
      </body>
    </html>
  );
}
