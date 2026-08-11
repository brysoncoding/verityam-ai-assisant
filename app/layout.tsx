import type { Metadata, Viewport } from "next";
import "./globals.css";
import PWAInstallPrompt from "./components/PWAInstallPrompt";
import MobileNavigation from "./components/MobileNavigation";

export const metadata: Metadata = {
  title: "ECHO Assistant",
  description: "ECHO Assistant is a personal AI workspace for conversations, chat history, voice commands, memory, and supported Google tools such as Gmail and Calendar.",
  applicationName: "ECHO Assistant",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "ECHO Assistant",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#050607",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
        <MobileNavigation />
        <PWAInstallPrompt />
      </body>
    </html>
  );
}
