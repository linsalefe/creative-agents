import React from "react";
import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";

type Props = {
  text: string;
  animation: "fade_in" | "slide_up" | "typewriter" | "scale_in";
  startFrame: number;
  durationFrames: number;
  fontSize: number;
  color: string;
  position: "top" | "center" | "bottom";
  fontFamily?: string;
};

export const AnimatedText: React.FC<Props> = ({
  text,
  animation,
  startFrame,
  durationFrames,
  fontSize,
  color,
  position,
  fontFamily = "Inter, sans-serif",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const relativeFrame = frame - startFrame;

  if (relativeFrame < 0 || relativeFrame > durationFrames) return null;

  const positionStyle: React.CSSProperties = {
    top: position === "top" ? "10%" : position === "center" ? "50%" : undefined,
    bottom: position === "bottom" ? "15%" : undefined,
    transform: position === "center" ? "translateY(-50%)" : undefined,
  };

  let opacity = 1;
  let translateY = 0;
  let scale = 1;
  let displayText = text;

  // Fade out in last 10 frames
  const fadeOutStart = durationFrames - 10;
  const fadeOut =
    relativeFrame > fadeOutStart
      ? interpolate(relativeFrame, [fadeOutStart, durationFrames], [1, 0], {
          extrapolateRight: "clamp",
        })
      : 1;

  switch (animation) {
    case "fade_in":
      opacity =
        interpolate(relativeFrame, [0, 15], [0, 1], {
          extrapolateRight: "clamp",
        }) * fadeOut;
      break;

    case "slide_up":
      opacity =
        interpolate(relativeFrame, [0, 12], [0, 1], {
          extrapolateRight: "clamp",
        }) * fadeOut;
      translateY = interpolate(relativeFrame, [0, 12], [60, 0], {
        extrapolateRight: "clamp",
      });
      break;

    case "typewriter": {
      const charsToShow = Math.floor(
        interpolate(relativeFrame, [0, Math.min(text.length * 2, durationFrames * 0.6)], [0, text.length], {
          extrapolateRight: "clamp",
        })
      );
      displayText = text.slice(0, charsToShow);
      opacity = fadeOut;
      break;
    }

    case "scale_in": {
      const scaleSpring = spring({
        frame: relativeFrame,
        fps,
        config: { damping: 12, stiffness: 200 },
      });
      scale = scaleSpring;
      opacity = scaleSpring * fadeOut;
      break;
    }
  }

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        padding: "0 60px",
        ...positionStyle,
      }}
    >
      <div
        style={{
          fontSize,
          fontFamily,
          fontWeight: 700,
          color,
          opacity,
          transform: `translateY(${translateY}px) scale(${scale})`,
          textAlign: "center",
          textShadow: "0 2px 20px rgba(0,0,0,0.5)",
          lineHeight: 1.2,
        }}
      >
        {displayText}
      </div>
    </div>
  );
};
