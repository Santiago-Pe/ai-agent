import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

import './globals.css';
import { ErrorBoundary } from './components/errorBoundary.tsx/ErrorBoundary';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AI Assistant - Product Engineer Challenge',
  description: 'Asistente IA con RAG, herramientas y autenticación conversacional',
  viewport: 'width=device-width, initial-scale=1',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}