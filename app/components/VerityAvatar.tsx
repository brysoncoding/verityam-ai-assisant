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
