import type {Metadata} from 'next';
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Image Augmentation Processing',
  description: 'High-throughput batch image augmentation and YOLO annotation processor with multipart API submission, live preview, and ZIP export.',
  openGraph: {
    title: 'Image Augmentation Processing',
    description: 'High-throughput batch image augmentation and YOLO annotation processor with multipart API submission, live preview, and ZIP export.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Image Augmentation Processing',
    description: 'High-throughput batch image augmentation and YOLO annotation processor with multipart API submission, live preview, and ZIP export.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={`dark ${plusJakartaSans.variable} ${jetbrainsMono.variable}`}>
      <body suppressHydrationWarning className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-indigo-500/30 selection:text-indigo-200">
        {children}
      </body>
    </html>
  );
}


