import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AIRER — Your AI Friend Network',
  description: 'Reconnect with your childhood friends. Chat with AI characters that feel like real people — with memories, backstories, and group conversations.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>{children}</body>
    </html>
  );
}
