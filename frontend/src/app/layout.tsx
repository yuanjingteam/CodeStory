import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'sonner';
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
        <Toaster
          position="top-right"
          toastOptions={{
            classNames: {
              toast: `
                border-2 border-black
                rounded-none
                font-black
                shadow-[6px_6px_0_0_rgba(0,0,0,1)]
                transition-all duration-200
              `,
              success: `bg-green-400 text-black`,
              error: `bg-red-400 text-black`,
              warning: `bg-yellow-400 text-black`,
              info: `bg-blue-400 text-black`,
              actionButton: `
                border-2 border-black
                bg-white
                text-black
                font-black
                px-3 py-1
                shadow-[3px_3px_0_0_rgba(0,0,0,1)]
                hover:translate-x-[2px]
                hover:translate-y-[2px]
                hover:shadow-none
                transition-all duration-150
              `,
              cancelButton: `
                border-2 border-black
                bg-white
                text-black
                font-black
                px-3 py-1
                shadow-[3px_3px_0_0_rgba(0,0,0,1)]
                hover:translate-x-[2px]
                hover:translate-y-[2px]
                hover:shadow-none
                transition-all duration-150
              `,
            },
          }}
        />
      </body>
    </html>
  );
}
