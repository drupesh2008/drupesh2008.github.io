import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk, Instrument_Serif, Newsreader } from 'next/font/google';
import Script from 'next/script';
import { GA_TRACKING_ID } from '@/lib/gtag';
import Analytics from '@/components/Analytics';
import "./globals.css";

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

// display face for the landing's "Where, and who."
const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
});

const newsreader = Newsreader({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-newsreader',
  display: 'swap',
});

const SITE = 'https://crysthope.com'
const DESC = 'D Rupesh Kumar, Senior Vice President of Engineering building agentic AI and fintech platforms. Free learning pathways, engineering tech blogs index and explained research papers, plus a 7+ year journey across SpaceTech, geospatial, HR tech and fintech.'

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: 'D Rupesh Kumar - Engineering leader, learning pathways, tech blogs and research papers', template: '%s' },
  description: DESC,
  alternates: { canonical: '/' },
  openGraph: { type: 'website', siteName: 'D Rupesh Kumar', url: SITE, title: 'D Rupesh Kumar - A world of systems', description: DESC, images: [{ url: '/atlas/home-og.jpg', width: 1200, height: 675, alt: 'Atlas of connected terrain islands' }] },
  twitter: { card: 'summary_large_image', title: 'D Rupesh Kumar - A world of systems', description: DESC, images: ['/atlas/home-og.jpg'] },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} ${spaceGrotesk.variable} ${instrumentSerif.variable} ${newsreader.variable}`}
    >
      <head>
        {/* Set the theme before first paint so a stored choice never flashes.
            The dark pages read [data-theme]; /about stays light regardless. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t='dark';try{var s=localStorage.getItem('theme');if(s==='light'||s==='dark')t=s}catch(e){}document.documentElement.dataset.theme=t})()`,
          }}
        />
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
      <body className={inter.className}>
        <Analytics />
        {children}
      </body>
    </html>
  );
}
