import Link from "next/link";

export default function Header() {
  return (
    <header className="header">
      <div>
        <h1 className="title glow">ECHO</h1>
        <p className="subtitle">Signal received • ONLINE</p>
      </div>
      <Link href="/permissions" className="headerToolsButton">TOOLS & ACCESS</Link>
      <style jsx>{` .headerToolsButton{display:inline-flex;align-items:center;justify-content:center;padding:9px 12px;border:1px solid rgba(120,190,255,.16);border-radius:10px;background:rgba(10,17,22,.78);color:#8ed8ff;font-size:9px;font-weight:800;letter-spacing:1.5px;text-decoration:none;transition:.18s ease}.headerToolsButton:hover{border-color:rgba(120,210,255,.35);background:rgba(45,75,95,.25);box-shadow:0 0 18px rgba(50,170,255,.08)}`}</style>
    </header>
  );
}
