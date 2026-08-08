type InputBarProps = {
  message: string;
  setMessage: (value: string) => void;
  onSend: () => void;
};

export default function InputBar({
  message,
  setMessage,
  onSend,
}: InputBarProps) {
  return (
    <footer className="inputBar">
      <button className="micButton" title="Voice">
        🎤
      </button>

      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Talk to ECHO..."
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onSend();
          }
        }}
      />

      <button
        className="sendButton"
        onClick={onSend}
      >
        Send
      </button>
    </footer>
  );
}