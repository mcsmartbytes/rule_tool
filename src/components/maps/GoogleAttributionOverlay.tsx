"use client";

type Props = {
  text: string;
};

export function GoogleAttributionOverlay({ text }: Props) {
  return (
    <div
      style={{
        position: "absolute",
        left: 10,
        bottom: 24,
        display: "flex",
        flexDirection: "column",
        gap: 4,
        pointerEvents: "none",
        background: "rgba(0,0,0,0.55)",
        padding: "6px 10px",
        borderRadius: 6,
        maxWidth: 320,
        fontSize: 11,
        lineHeight: 1.3,
        color: "#fff",
        zIndex: 10,
      }}
    >
      {/* Google logo placeholder - replace with official asset for production */}
      <div style={{ fontWeight: 700, fontSize: 13, letterSpacing: 0.3 }}>Google</div>
      <div style={{ opacity: 0.9 }}>{text}</div>
    </div>
  );
}
