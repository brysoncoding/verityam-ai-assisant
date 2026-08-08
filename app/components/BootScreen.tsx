type BootScreenProps = {
  visible: boolean;
  onStart: () => void;
};

export default function BootScreen({
  visible,
  onStart,
}: BootScreenProps) {
  if (!visible) return null;

  return (
    <main className="bootScreen">
      <div className="bootGlow" />

      <div className="bootContent">
        <div className="bootLogo">
          <div className="bootOrb">
            <span />
            <span />
            <span />
          </div>
        </div>

        <p className="bootLabel">ARTIFICIAL INTELLIGENCE SYSTEM</p>

        <h1 className="bootTitle">ECHO</h1>

        <p className="bootVersion">ECHO AI // SYSTEM 1.0</p>

        <div className="bootStatus">
          <div>
            <span className="statusDot" />
            CORE SYSTEMS READY
          </div>

          <div>
            <span className="statusDot" />
            AI CONNECTION READY
          </div>

          <div>
            <span className="statusDot" />
            VOICE INTERFACE READY
          </div>
        </div>

        <button
          className="startButton"
          onClick={onStart}
        >
          <span>START ECHO</span>
          <span className="startArrow">→</span>
        </button>

        <p className="bootHint">
          INITIALIZE ASSISTANT INTERFACE
        </p>
      </div>
    </main>
  );
}