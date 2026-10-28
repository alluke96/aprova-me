import type { Metadata } from 'next';
import { Instrument_Sans } from 'next/font/google';
import './globals.css';

const instrumentSans = Instrument_Sans({
  subsets: ['latin'],
  variable: '--font-instrument-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'Aprova-me', template: '%s · Aprova-me' },
  description: 'Cadastro de recebíveis e cedentes',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={instrumentSans.variable}>
      <body className="min-h-dvh font-sans">{children}</body>
    </html>
  );
}
