import type { Metadata, Viewport } from "next";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { ToastProvider } from "@/components/common/ToastProvider";
import { OfflineBanner } from "@/components/ui/StateViews";
import { BottomNav } from "@/components/navigation/BottomNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Face Card — Editorial Beauty Intelligence & Collectible Cards",
  description:
    "Discover your facial harmony, photo craft, and skin radiance. Collect your tiered Face Card and curate your personal beauty ritual.",
  applicationName: "Face Card",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full scroll-smooth" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col font-sans antialiased selection:bg-[var(--accent-soft)] selection:text-[var(--text-main)] transition-colors duration-200">
        <ThemeProvider>
          <QueryProvider>
            <ToastProvider>
              <OfflineBanner />
              {children}
              <BottomNav />
            </ToastProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
