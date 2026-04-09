import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";

type Props = {
  color: string;
  height?: number;
};

export const ProgressBar: React.FC<Props> = ({ color, height = 6 }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, width } = useVideoConfig();

  const progress = interpolate(frame, [0, durationInFrames], [0, 100], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width,
        height,
        backgroundColor: "rgba(255,255,255,0.15)",
        zIndex: 100,
      }}
    >
      <div
        style={{
          width: `${progress}%`,
          height: "100%",
          backgroundColor: color,
          borderRadius: "0 3px 3px 0",
          boxShadow: `0 0 12px ${color}80`,
        }}
      />
    </div>
  );
};
