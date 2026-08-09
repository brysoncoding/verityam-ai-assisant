"use client";

import Link from "next/link";
import Header from "../components/Header";
import ToolPermissions from "../components/ToolPermissions";

export default function PermissionsPage() {
  return (
    <main className="app permissionsPage">
      <Header />
      <div className="permissionsShell">
        <Link href="/" className="backButton">← BACK TO ECHO</Link>
        <ToolPermissions />
      </div>
      <style jsx>{`
        .permissionsShell{width:min(1100px,100%);margin:0 auto;padding:18px 20px 40px}.backButton{display:inline-flex;align-items:center;padding:8px 11px;border:1px solid rgba(120,190,255,.12);border-radius:9px;background:rgba(10,17,22,.7);color:#8ed8ff;text-decoration:none;font-size:9px;font-weight:800;letter-spacing:1.2px}.backButton:hover{border-color:rgba(120,210,255,.3);background:rgba(45,75,95,.2)}
      `}</style>
    </main>
  );
}
