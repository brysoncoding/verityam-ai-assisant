type MessageProps = {
  role: "user" | "assistant";
  content: string;
};

export default function Message({
  role,
  content,
}: MessageProps) {
  return (
    <div
      className={`message ${
        role === "user" ? "user" : "ai"
      }`}
    >
      <strong>
        {role === "user" ? "You" : "VERITY"}
      </strong>

      <br />

      {content}
    </div>
  );
}