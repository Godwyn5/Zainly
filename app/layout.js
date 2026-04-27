import { Playfair_Display, DM_Sans, Amiri } from "next/font/google";
import Script from "next/script";
import CapacitorBridge from "@/components/CapacitorBridge";
import "./globals.css";

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const amiri = Amiri({
  variable: "--font-amiri",
  subsets: ["latin"],
  weight: ["700"],
});

export const metadata = {
  metadataBase: new URL('https://zainly.app'),
  title: 'Zainly',
  description: 'Deviens Hafiz. Un ayat à la fois.',
  manifest: '/manifest.json',
  alternates: {
    canonical: 'https://zainly.app',
  },
  openGraph: {
    title: 'Zainly',
    description: 'Deviens Hafiz. Un ayat à la fois.',
    url: 'https://zainly.app',
    siteName: 'Zainly',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Zainly',
    description: 'Deviens Hafiz. Un ayat à la fois.',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Zainly',
  },
  verification: {
    google: 'gCIMd-1qGIq1lrgOE73oHOT0yusVwwR9KnkwNFHGBgc',
  },
};

export const viewport = {
  themeColor: '#163026',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${playfairDisplay.variable} ${dmSans.variable} ${amiri.variable} h-full antialiased`}
    >
      <body
        className="min-h-full flex flex-col"
        style={{ fontFamily: "var(--font-dm-sans), sans-serif", backgroundColor: "#F5F0E6" }}
      >
        {children}
        <CapacitorBridge />
        <Script
          id="sw-register"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('/sw.js').then(reg => {
                  reg.addEventListener('updatefound', () => {
                    const newWorker = reg.installing;
                    newWorker.addEventListener('statechange', () => {
                      if (newWorker.state === 'activated') {
                        window.location.reload();
                      }
                    });
                  });
                });
              }
            `
          }}
        />
        <Script
          id="microsoft-clarity"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function(c,l,a,r,i,t,y){
                c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
              })(window, document, "clarity", "script", "w1b5pk7ckx");
            `,
          }}
        />
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-LNY8GFJT1G"
          strategy="afterInteractive"
        />
        <Script
          id="google-analytics"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-LNY8GFJT1G');
            `,
          }}
        />
      </body>
    </html>
  );
}
