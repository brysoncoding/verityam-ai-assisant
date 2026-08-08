"use client";

type VerityAvatarProps = {
  speaking?: boolean;
  thinking?: boolean;
};

export default function VerityAvatar({
  speaking = false,
  thinking = false,
}: VerityAvatarProps) {
  return (
    <div className={`verity-avatar ${speaking ? "speaking" : ""} ${thinking ? "thinking" : ""}`}>
      <div className="verity-glow" />

      <div className="verity-head">
        <div className="verity-eyes">
          <div className="verity-eye" />
          <div className="verity-eye" />
        </div>

        <div className="verity-mouth">
          <div className="verity-mouth-inner" />
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