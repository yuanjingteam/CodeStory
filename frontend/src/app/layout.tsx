import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CodeStory',
  description: 'Code practice platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className="h-screen">
      <body className="h-screen bg-white relative overflow-hidden">
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle,_#000_1px,_transparent_1px)] bg-[size:20px_20px]"></div>
        </div>
        {children}
      </body>
    </html>
  );
}
