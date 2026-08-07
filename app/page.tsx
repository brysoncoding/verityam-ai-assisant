export default function Home() {
  return (
    <main className="app">
      <header className="header">
        <h1 className="title glow">VERITY</h1>
        <p className="subtitle">
          Signal received • AI Assistant Online
        </p>
      </header>

      <section className="chat">
        <div className="message ai">
          <strong>VERITY</strong>
          <br />
          Welcome.
          <br />
          I am VERITY, your personal AI assistant.
          <br />
          How can I help you today?
        </div>

        <div className="message user">
          Hello!
        </div>
      </section>

      <footer className="inputBar">
        <input
          type="text"
          placeholder="Talk to VERITY..."
        />

        <button className="sendButton">
          Send
        </button>
      </footer>
    </main>
  );
}