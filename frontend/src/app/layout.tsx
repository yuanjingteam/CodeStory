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
      <body className="min-h-screen  relative ">
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle,_#000_1px,_transparent_1px)] bg-[size:20px_20px]"></div>
        </div>
     <div className="w-[95%] max-w-[1500px] mx-auto my-4 border-2 border-black bg-white shadow-[4px_4px_0px_#000] rounded-sm relative z-10">
        {children}
     </div>
        <Toaster
          position="top-right"
          toastOptions={{
            className:
              '!border-2 !border-black !rounded-none !font-black !shadow-[2px_2px_0_0_rgba(0,0,0,1)]',
            actionButtonStyle: {
              background: 'white',
              color: 'black',
              border: '2px solid black',
            },
          }}
        />
      </body>
    </html>
  );
}
