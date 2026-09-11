import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./echo-ui.css";
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
        <style dangerouslySetInnerHTML={{ __html: `
          /* Settings polish: one clean identity panel, no decorative duplicate content. */
          .settingsPage {
            width: 100%;
            max-width: 900px;
            margin: 0 auto;
            padding: 28px 24px 42px;
            overflow-y: auto;
          }
          .settingsPage::before { content: none !important; display: none !important; }
          .settingsHero {
            display: flex;
            align-items: center;
            gap: 18px;
            margin: 0 0 22px;
            padding: 4px 2px 20px;
            border-bottom: 1px solid rgba(126,220,255,.10);
          }
          .settingsOrb {
            width: 54px;
            height: 54px;
            flex: 0 0 54px;
            display: grid;
            place-items: center;
            border: 1px solid rgba(126,220,255,.22);
            border-radius: 16px;
            background: rgba(126,220,255,.06);
            box-shadow: 0 0 28px rgba(70,190,255,.08);
            font-size: 24px;
          }
          .settingsHero h2 { margin: 3px 0 4px; font-size: clamp(26px, 5vw, 36px); letter-spacing: .08em; }
          .settingsHero p { margin: 0; color: rgba(190,218,226,.64); font-size: 14px; }
          .settingsInfoCard {
            display: flex;
            align-items: center;
            gap: 16px;
            min-height: 112px;
            margin: 0 0 12px;
            padding: 20px 22px;
            border: 1px solid rgba(126,220,255,.12);
            border-radius: 18px;
            background: linear-gradient(145deg, rgba(10,17,23,.92), rgba(5,10,14,.90));
            box-shadow: 0 12px 30px rgba(0,0,0,.16);
          }
          .settingsInfoIcon {
            width: 42px;
            height: 42px;
            flex: 0 0 42px;
            display: grid;
            place-items: center;
            border-radius: 12px;
            background: rgba(126,220,255,.07);
            color: #7edcff;
            font-size: 20px;
          }
          .settingsInfoCard > div { min-width: 0; flex: 1; }
          .settingsLabel { display: block; margin-bottom: 4px; color: #75909b; font-size: 10px; font-weight: 800; letter-spacing: .18em; }
          .settingsInfoCard strong { display: block; color: #e9f7fb; font-size: 25px; letter-spacing: .04em; }
          .settingsInfoCard p { margin: 3px 0 0; color: rgba(164,198,209,.58); font-size: 13px; line-height: 1.45; }
          .settingsFooterCard {
            margin-top: 18px;
            padding: 20px 22px;
            border: 1px solid rgba(126,220,255,.10);
            border-radius: 18px;
            background: rgba(7,13,18,.72);
          }
          .settingsFooterCard h3 { margin: 5px 0 6px; font-size: 15px; letter-spacing: .12em; }
          .settingsFooterCard p { margin: 0; color: rgba(164,198,209,.56); font-size: 13px; line-height: 1.55; }
          @media (max-width: 520px) {
            .settingsPage { padding: 20px 14px 34px; }
            .settingsHero { gap: 13px; padding-bottom: 17px; }
            .settingsOrb { width: 46px; height: 46px; flex-basis: 46px; font-size: 20px; }
            .settingsInfoCard { min-height: 96px; padding: 16px; gap: 12px; }
            .settingsInfoIcon { width: 38px; height: 38px; flex-basis: 38px; }
            .settingsInfoCard strong { font-size: 21px; }
          }
        ` }} />
        <MobileNavigation />
        <PWAInstallPrompt />
      </body>
    </html>
  );
}
