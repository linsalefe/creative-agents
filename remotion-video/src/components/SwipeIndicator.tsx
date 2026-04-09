import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";

type Props = {
  text?: string;
  color: string;
  startFrame: number;
};

export const SwipeIndicator: React.FC<Props> = ({
  text = "Saiba mais",
  color,
  startFrame,
}) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const relativeFrame = frame - startFrame;

  if (relativeFrame < 0) return null;

  const opacity = interpolate(relativeFrame, [0, 12], [0, 0.9], {
    extrapolateRight: "clamp",
  });

  // Bouncing arrow animation (repeating)
  const bounce = Math.sin(relativeFrame * 0.12) * 8;

  const entranceScale = spring({
    frame: relativeFrame,
    fps,
    config: { damping: 14, stiffness: 120 },
  });

  return (
    <div
      style={{
        position: "absolute",
        bottom: "5%",
        left: 0,
        right: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        opacity,
        transform: `scale(${entranceScale})`,
        zIndex: 90,
      }}
    >
      {/* Arrow */}
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        style={{ transform: `translateY(${bounce}px) rotate(180deg)` }}
      >
        <path
          d="M12 19V5M5 12l7-7 7 7"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span
        style={{
          fontSize: 22,
          fontFamily: "Inter, sans-serif",
          fontWeight: 600,
          color,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
        }}
      >
        {text}
      </span>
    </div>
  );
};
