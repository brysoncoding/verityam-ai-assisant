import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./echo-ui.css";
import PWAInstallPrompt from "./components/PWAInstallPrompt";
import MobileNavigation from "./components/MobileNavigation";

export const metadata: Metadata = {
  title: "ECHO Assistant",
  description: "ECHO Assistant is a personal AI workspace.",
  applicationName: "ECHO Assistant",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "ECHO Assistant", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#050607",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
        <style dangerouslySetInnerHTML={{ __html: `
          /* ECHO Settings: clean, compact information dashboard. */
          .settingsPage {
            width: 100%;
            max-width: 920px;
            margin: 0 auto;
            padding: 30px 26px 46px;
            overflow-y: auto;
          }
          .settingsHero {
            position: relative;
            display: flex;
            align-items: center;
            gap: 18px;
            margin: 0 0 20px;
            padding: 20px 22px;
            border: 1px solid rgba(126,220,255,.13);
            border-radius: 20px;
            background: linear-gradient(135deg, rgba(126,220,255,.055), rgba(7,13,18,.86) 48%, rgba(5,10,14,.92));
            box-shadow: 0 16px 38px rgba(0,0,0,.2);
            overflow: hidden;
          }
          .settingsHero::after {
            content: "● ONLINE";
            position: absolute;
            top: 17px;
            right: 18px;
            padding: 6px 9px;
            border: 1px solid rgba(126,220,255,.14);
            border-radius: 999px;
            background: rgba(126,220,255,.045);
            color: #7edcff;
            font-size: 8px;
            font-weight: 900;
            letter-spacing: .12em;
          }
          .settingsOrb {
            width: 58px;
            height: 58px;
            flex: 0 0 58px;
            display: grid;
            place-items: center;
            border: 1px solid rgba(126,220,255,.23);
            border-radius: 17px;
            background: rgba(126,220,255,.07);
            box-shadow: 0 0 32px rgba(70,190,255,.1), inset 0 0 18px rgba(126,220,255,.035);
            font-size: 25px;
          }
          .settingsHero h2 { margin: 4px 0 5px; color: #e9f7fb; font-size: clamp(25px, 5vw, 34px); letter-spacing: .1em; }
          .settingsHero p { margin: 0; color: rgba(190,218,226,.62); font-size: 12px; line-height: 1.5; }
          .settingsInfoGrid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 12px;
          }
          .settingsInfoCard {
            position: relative;
            display: flex;
            align-items: flex-start;
            gap: 14px;
            min-height: 128px;
            margin: 0;
            padding: 18px;
            border: 1px solid rgba(126,220,255,.105);
            border-radius: 17px;
            background: linear-gradient(145deg, rgba(10,17,23,.94), rgba(5,10,14,.9));
            box-shadow: 0 12px 28px rgba(0,0,0,.15);
            transition: transform .16s ease, border-color .16s ease, box-shadow .16s ease;
          }
          .settingsInfoCard:hover {
            transform: translateY(-2px);
            border-color: rgba(126,220,255,.19);
            box-shadow: 0 16px 34px rgba(0,0,0,.22);
          }
          .settingsInfoCard::before {
            content: "";
            position: absolute;
            left: 18px;
            right: 18px;
            top: 0;
            height: 1px;
            background: linear-gradient(90deg, transparent, rgba(126,220,255,.18), transparent);
          }
          .settingsInfoIcon {
            width: 40px;
            height: 40px;
            flex: 0 0 40px;
            display: grid;
            place-items: center;
            border: 1px solid rgba(126,220,255,.13);
            border-radius: 12px;
            background: rgba(126,220,255,.065);
            color: #7edcff;
            font-size: 18px;
          }
          .settingsInfoCard > div { min-width: 0; flex: 1; }
          .settingsLabel { display: block; margin: 2px 0 6px; color: #718b96; font-size: 8px; font-weight: 900; letter-spacing: .16em; }
          .settingsInfoCard strong { display: block; color: #e9f7fb; font-size: 22px; line-height: 1.1; letter-spacing: .05em; }
          .settingsInfoCard p { margin: 8px 0 0; color: rgba(164,198,209,.55); font-size: 10px; line-height: 1.5; }
          .settingsInfoCard.nextRelease { border-color: rgba(126,220,255,.2); background: linear-gradient(145deg, rgba(126,220,255,.075), rgba(5,10,14,.92)); }
          .settingsInfoCard.nextRelease .settingsInfoIcon { box-shadow: 0 0 20px rgba(126,220,255,.08); }
          .settingsFooterCard {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 18px;
            margin-top: 12px;
            padding: 18px 20px;
            border: 1px solid rgba(126,220,255,.09);
            border-radius: 17px;
            background: rgba(7,13,18,.72);
          }
          .settingsFooterCard h3 { margin: 5px 0 6px; color: #b9e6f6; font-size: 11px; letter-spacing: .13em; }
          .settingsFooterCard p { max-width: 680px; margin: 0; color: rgba(164,198,209,.52); font-size: 10px; line-height: 1.6; }
          .settingsStatus {
            flex: 0 0 auto;
            padding: 7px 10px;
            border: 1px solid rgba(126,220,255,.14);
            border-radius: 999px;
            background: rgba(126,220,255,.045);
            color: #7edcff;
            font-size: 7px;
            font-weight: 900;
            letter-spacing: .12em;
          }
          @media (max-width: 720px) {
            .settingsPage { padding: 22px 16px 38px; }
            .settingsInfoGrid { grid-template-columns: 1fr; gap: 10px; }
            .settingsInfoCard { min-height: 94px; }
            .settingsFooterCard { align-items: flex-start; flex-direction: column; }
          }
          @media (max-width: 520px) {
            .settingsHero { gap: 13px; padding: 17px 15px; padding-top: 48px; align-items: flex-start; }
            .settingsHero::after { top: 15px; left: 15px; right: auto; }
            .settingsOrb { width: 46px; height: 46px; flex-basis: 46px; font-size: 20px; }
            .settingsHero h2 { font-size: 21px; }
            .settingsHero p { font-size: 10px; }
            .settingsInfoCard { padding: 15px; }
            .settingsInfoIcon { width: 37px; height: 37px; flex-basis: 37px; }
            .settingsInfoCard strong { font-size: 20px; }
          }
        ` }} />
        <MobileNavigation />
        <PWAInstallPrompt />
      </body>
    </html>
  );
}
