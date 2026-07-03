import type { Metadata } from 'next';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['700', '800'], variable: '--font-jakarta' });

export const metadata: Metadata = {
  title: 'Onelytics — Unified Marketing Analytics',
  description: 'Connect Google Analytics, Google Ads, Search Console, and Meta Ads into one powerful dashboard.',
  verification: {
    google: 'xpYzhIpmajPXoqiKz2UrTpECQ-9v__-LPfQJi_LMq14',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jakarta.variable}`}>
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
