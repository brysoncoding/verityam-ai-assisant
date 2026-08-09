"use client";

type VerityAvatarProps = {
  speaking?: boolean;
  thinking?: boolean;
};

export default function VerityAvatar({
  speaking = false,
  thinking = false,
}: VerityAvatarProps) {
  const stateClass = thinking
    ? "thinking"
    : speaking
      ? "speaking"
      : "";

  return (
    <div className={`verity-avatar ${stateClass}`}>
      <div className="verity-glow" />

      <div className="echo-ball">
        <div className="echo-ball-highlight" />
        <div className="echo-ball-ring" />

        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: "25% 20% 22%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "16px",
            zIndex: 4,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "34px",
            }}
          >
            <span
              style={{
                display: "block",
                width: "14px",
                height: "20px",
                borderRadius: "50%",
                background: "#e9fbff",
                boxShadow: "0 0 10px rgba(210, 247, 255, 0.95)",
              }}
            />
            <span
              style={{
                display: "block",
                width: "14px",
                height: "20px",
                borderRadius: "50%",
                background: "#e9fbff",
                boxShadow: "0 0 10px rgba(210, 247, 255, 0.95)",
              }}
            />
          </div>

          <div
            style={{
              width: "52px",
              height: "25px",
              borderBottom: "5px solid #e9fbff",
              borderRadius: "0 0 50px 50px",
              filter: "drop-shadow(0 0 6px rgba(210, 247, 255, 0.8))",
              transform: "translateY(-2px)",
            }}
          />
        </div>
      </div>

      <div className="verity-name">ECHO</div>

      {thinking && (
        <div className="verity-status">
          <span />
          <span />
          <span />
        </div>
      )}

      {speaking && !thinking && (
        <div className="verity-status speaking-status">
          SPEAKING
        </div>
      )}
    </div>
  );
}
