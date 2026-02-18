import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

const GREEN = "#35D07F";

interface SlideProps {
  title: string;
  emoji: string;
  subtitle: string;
  bullets: string[];
  highlight: string;
  index: number;
}

export const Slide: React.FC<SlideProps> = ({ title, emoji, subtitle, bullets, highlight, index }) => {
  const frame = useCurrentFrame();

  // Fade in/out
  const opacity = interpolate(frame, [0, 20, 130, 150], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Title slide up
  const titleY = interpolate(frame, [0, 25], [40, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        opacity,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "80px 120px",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
      }}
    >
      {/* Slide number */}
      <div style={{ position: "absolute", top: 40, right: 60, color: "#555", fontSize: 20 }}>
        {index + 1} / 8
      </div>

      {/* Brand */}
      {index === 0 && (
        <div style={{ position: "absolute", top: 40, left: 60, color: GREEN, fontSize: 22, fontWeight: 700 }}>
          PerkyJobs 🐦💼
        </div>
      )}

      {/* Title */}
      <div
        style={{
          transform: `translateY(${titleY}px)`,
          textAlign: "center",
          marginBottom: 16,
        }}
      >
        <span style={{ fontSize: 52 }}>{emoji}</span>
        <h1 style={{ color: GREEN, fontSize: 56, fontWeight: 800, margin: "8px 0 0" }}>{title}</h1>
      </div>

      {/* Subtitle */}
      <div
        style={{
          color: "#ffffff",
          fontSize: 30,
          fontWeight: 600,
          marginBottom: 40,
          textAlign: "center",
          opacity: interpolate(frame, [10, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      >
        {subtitle}
      </div>

      {/* Bullets */}
      <div style={{ width: "100%", maxWidth: 1100 }}>
        {bullets.map((bullet, i) => {
          const bulletOpacity = interpolate(frame, [20 + i * 8, 30 + i * 8], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const bulletX = interpolate(frame, [20 + i * 8, 30 + i * 8], [30, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          return (
            <div
              key={i}
              style={{
                opacity: bulletOpacity,
                transform: `translateX(${bulletX}px)`,
                color: "#e0e0e0",
                fontSize: 26,
                marginBottom: 14,
                paddingLeft: 20,
                borderLeft: `3px solid ${GREEN}44`,
                lineHeight: 1.5,
              }}
            >
              {bullet}
            </div>
          );
        })}
      </div>

      {/* Highlight */}
      <div
        style={{
          marginTop: 36,
          color: GREEN,
          fontSize: 24,
          fontStyle: "italic",
          fontWeight: 500,
          textAlign: "center",
          maxWidth: 900,
          opacity: interpolate(frame, [70, 90], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      >
        {highlight}
      </div>

      {/* Bottom bar */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          height: 4,
          backgroundColor: GREEN,
          width: `${((index + frame / 150) / 8) * 100}%`,
        }}
      />
    </AbsoluteFill>
  );
};
