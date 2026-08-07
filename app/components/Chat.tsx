import Message from "./Message";

export type ChatMessage = {
  id: number;
  role: "user" | "assistant";
  content: string;
};

type ChatProps = {
  messages: ChatMessage[];
};

export default function Chat({
  messages,
}: ChatProps) {
  return (
    <section className="chat">
      {messages.map((message) => (
        <Message
          key={message.id}
          role={message.role}
          content={message.content}
        />
      ))}
    </section>
  );
}