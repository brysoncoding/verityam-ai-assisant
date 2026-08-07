type BootScreenProps = {
  visible: boolean;
};

export default function BootScreen({
  visible,
}: BootScreenProps) {
  if (!visible) return null;

  return (
    <div className="bootScreen">
      <h1 className="title glow">VERITY</h1>

      <p>INITIALIZING...</p>
      <p>LOADING CORE...</p>
      <p>CONNECTING...</p>
      <p>SIGNAL RECEIVED</p>

      <br />

      <strong>ONLINE</strong>
    </div>
  );
}