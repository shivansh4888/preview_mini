import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { HardDrive } from "lucide-react";
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
  title: "Preview Manager | Zata.ai Storage Platform",
  description: "Configure Zata endpoints, browse files, and preview them directly in the browser.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      style={{ colorScheme: "light" }}
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
    >
      <body className="h-full bg-slate-50 text-slate-900 font-sans antialiased flex flex-col">
        {/* Navigation Bar */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex h-14 items-center justify-between">
              {/* Logo */}
              <div className="flex items-center gap-3">
                <Link href="/" className="flex items-center gap-2 group">
                  <div className="p-1.5 rounded-lg bg-blue-600 text-white">
                    <HardDrive size={16} strokeWidth={2.5} />
                  </div>
                  <span className="font-semibold text-base text-slate-900 tracking-tight">
                    Preview Manager
                  </span>
                </Link>
                <div className="hidden sm:flex items-center">
                  <span className="h-4 w-px bg-slate-200 mx-3"></span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-100">
                    Zata.ai
                  </span>
                </div>
              </div>

              {/* Nav Actions */}
              <div className="flex items-center gap-3">
                <Link
                  href="/"
                  className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
                >
                  Dashboard
                </Link>
                <Link
                  href="/endpoints/new"
                  className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-500 transition-colors"
                >
                  + Add Endpoint
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-100 bg-white py-4 text-center text-xs text-slate-400">
          <div className="max-w-7xl mx-auto px-4">
            © {new Date().getFullYear()} Preview Manager — Zata.ai Storage Platform
          </div>
        </footer>
      </body>
    </html>
  );
}
