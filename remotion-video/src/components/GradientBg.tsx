import React from "react";
import { useCurrentFrame, interpolate } from "remotion";

type Props = {
  colorA: string;
  colorB: string;
  width: number;
  height: number;
};

export const GradientBg: React.FC<Props> = ({ colorA, colorB, width, height }) => {
  const frame = useCurrentFrame();

  const angle = interpolate(frame, [0, 300], [135, 225], {
    extrapolateRight: "extend",
  });

  return (
    <div
      style={{
        width,
        height,
        background: `linear-gradient(${angle}deg, ${colorA}, ${colorB})`,
        position: "absolute",
        top: 0,
        left: 0,
      }}
    />
  );
};
