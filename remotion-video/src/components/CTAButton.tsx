import React from "react";
import { useCurrentFrame, spring, useVideoConfig, interpolate } from "remotion";

type Props = {
  text: string;
  startFrame: number;
  durationFrames: number;
  bgColor: string;
  textColor: string;
  fontSize?: number;
};

export const CTAButton: React.FC<Props> = ({
  text,
  startFrame,
  durationFrames,
  bgColor,
  textColor,
  fontSize = 36,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const relativeFrame = frame - startFrame;

  if (relativeFrame < 0 || relativeFrame > durationFrames) return null;

  // Bounce entrance
  const entranceScale = spring({
    frame: relativeFrame,
    fps,
    config: { damping: 10, stiffness: 150 },
  });

  // Subtle pulse after entrance
  const pulse =
    relativeFrame > 15
      ? 1 + 0.03 * Math.sin((relativeFrame - 15) * 0.15)
      : 1;

  const opacity = interpolate(relativeFrame, [0, 8], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        bottom: "12%",
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          backgroundColor: bgColor,
          color: textColor,
          fontSize,
          fontWeight: 700,
          fontFamily: "Inter, sans-serif",
          padding: "20px 60px",
          borderRadius: 16,
          opacity,
          transform: `scale(${entranceScale * pulse})`,
          boxShadow: "0 8px 30px rgba(0,0,0,0.3)",
        }}
      >
        {text}
      </div>
    </div>
  );
};
