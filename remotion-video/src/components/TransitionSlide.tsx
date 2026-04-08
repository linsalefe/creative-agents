import React from "react";
import { useCurrentFrame, interpolate, Img } from "remotion";

type Props = {
  src: string;
  transicao: "fade" | "slide_left" | "slide_right" | "zoom_in";
  durationFrames: number;
  width: number;
  height: number;
};

export const TransitionSlide: React.FC<Props> = ({
  src,
  transicao,
  durationFrames,
  width,
  height,
}) => {
  const frame = useCurrentFrame();
  const transitionFrames = 15;

  // Entrance
  let opacity = interpolate(frame, [0, transitionFrames], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Exit
  const exitOpacity = interpolate(
    frame,
    [durationFrames - transitionFrames, durationFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  opacity = Math.min(opacity, exitOpacity);

  let translateX = 0;
  let scale = 1;

  switch (transicao) {
    case "slide_left":
      translateX = interpolate(frame, [0, transitionFrames], [width, 0], {
        extrapolateRight: "clamp",
      });
      break;
    case "slide_right":
      translateX = interpolate(frame, [0, transitionFrames], [-width, 0], {
        extrapolateRight: "clamp",
      });
      break;
    case "zoom_in":
      scale = interpolate(frame, [0, durationFrames], [1, 1.15], {
        extrapolateRight: "clamp",
      });
      break;
    case "fade":
    default:
      break;
  }

  return (
    <div
      style={{
        width,
        height,
        opacity,
        transform: `translateX(${translateX}px) scale(${scale})`,
        overflow: "hidden",
      }}
    >
      <Img
        src={src}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    </div>
  );
};
