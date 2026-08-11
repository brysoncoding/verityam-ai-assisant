export default function PrivacyPage() {
  return (
    <main style={{maxWidth:820,margin:'0 auto',padding:'48px 24px',color:'#e9fbff',fontFamily:'system-ui',lineHeight:1.7}}>
      <a href="/download" style={{color:'#8ed8ff'}}>← Back to ECHO</a>
      <h1>ECHO Privacy Notice</h1>
      <p><strong>Last updated: August 10, 2026</strong></p>
      <p>This page explains, at a high level, how the ECHO web application handles information. ECHO is an evolving project, so this notice may be updated as features change.</p>
      <h2>Information you provide</h2>
      <p>When you use ECHO, you may provide messages, voice input, preferences, and information you choose to save as conversation memory. ECHO uses this information to provide the features you request.</p>
      <h2>Google services</h2>
      <p>If you connect Google services, ECHO requests only the Google permissions presented during authorization. Depending on the permissions you approve, ECHO may access Gmail or Calendar information and may create Calendar events on your behalf when you ask it to. You can disconnect your Google account from ECHO Settings and manage authorization through Google.</p>
      <h2>Authentication and security</h2>
      <p>Authentication credentials and service tokens are intended to be handled by the application's server-side systems rather than exposed as ordinary page content. No online service can guarantee absolute security, so do not provide information you would not want processed by an online assistant.</p>
      <h2>Third-party services</h2>
      <p>ECHO may rely on third-party infrastructure and AI or connected-service providers to deliver requested functionality. Their own privacy policies and terms may also apply.</p>
      <h2>Your choices</h2>
      <p>You can stop using ECHO, remove saved information where the application provides that control, and disconnect connected accounts from ECHO Settings. You should also review your Google account's third-party access controls when disconnecting Google.</p>
      <h2>Contact</h2>
      <p>For privacy questions about this project, use the contact method published with the ECHO project before sharing sensitive information.</p>
    </main>
  );
}
