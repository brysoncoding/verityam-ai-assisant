"use client";

import Link from "next/link";

export default function Header() {
  return (
    <header className="header">
      <div>
        <Link href="/download" className="title glow headerBrand">ECHO</Link>
        <p className="subtitle">Signal received • ONLINE</p>
      </div>
      <div className="headerActions">
        <Link href="/download" className="headerDownloadButton">GET ECHO</Link>
        <Link href="/#settings" className="headerToolsButton">SETTINGS</Link>
      </div>
      <style jsx>{`
        .headerBrand{color:inherit;text-decoration:none}
        .headerActions{display:flex;align-items:center;gap:7px}
        .headerDownloadButton,.headerToolsButton{display:inline-flex;align-items:center;justify-content:center;padding:9px 12px;border-radius:10px;text-decoration:none;font-size:9px;font-weight:800;letter-spacing:1.5px;transition:.18s ease}
        .headerDownloadButton{border:1px solid rgba(98,207,255,.3);background:rgba(98,207,255,.09);color:#bdefff}
        .headerDownloadButton:hover{border-color:rgba(98,207,255,.55);background:rgba(98,207,255,.15);box-shadow:0 0 18px rgba(50,170,255,.1)}
        .headerToolsButton{border:1px solid rgba(120,190,255,.16);background:rgba(10,17,22,.78);color:#8ed8ff}
        .headerToolsButton:hover{border-color:rgba(120,210,255,.35);background:rgba(45,75,95,.25);box-shadow:0 0 18px rgba(50,170,255,.08)}
        @media(max-width:520px){.headerActions{gap:5px}.headerDownloadButton,.headerToolsButton{padding:8px 9px;font-size:8px}.subtitle{font-size:8px}}
      `}</style>
    </header>
  );
}
