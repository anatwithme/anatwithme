import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Anatomy Study Groups",
  description: "Enhance your learning with interactive study groups",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} text-foreground antialiased`}
      >
        <div className="min-h-screen w-full bg-muted/15">
          <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6">
            {children}
          </div>
        </div>
        <Toaster 
          position="top-center" 
          richColors
          closeButton
          style={
            {
              "--width": "600px",
            } as React.CSSProperties
          }
          toastOptions={{
            classNames: {
              error:
                "!bg-red-100/90 !text-red-800 !border-red-800",
              success:
                "!bg-green-100/90 !text-green-800 !border-green-800",
              warning:
                "!bg-orange-100/90 !text-orange-800 !border-orange-800",
              content: 
                "!flex-1 !text-center !text-base",
            },
          }} 
        />
      </body>
    </html>
  );
}
