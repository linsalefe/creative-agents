import React from "react";
import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";

type Props = {
  text: string;
  animation: "fade_in" | "slide_up" | "typewriter" | "scale_in" | "word_reveal";
  startFrame: number;
  durationFrames: number;
  fontSize: number;
  color: string;
  position: "top" | "center" | "bottom";
  fontFamily?: string;
};

/* ------------------------------------------------------------------ */
/*  Meta Ads safe zones: ~14% top, ~20% bottom are covered by UI      */
/* ------------------------------------------------------------------ */
const SAFE_TOP = "18%";
const SAFE_CENTER = "45%";
const SAFE_BOTTOM = "25%";

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
    top: position === "top" ? SAFE_TOP : position === "center" ? SAFE_CENTER : undefined,
    bottom: position === "bottom" ? SAFE_BOTTOM : undefined,
    transform: position === "center" ? "translateY(-50%)" : undefined,
  };

  // Fade out in last 10 frames
  const fadeOutStart = durationFrames - 10;
  const fadeOut =
    relativeFrame > fadeOutStart
      ? interpolate(relativeFrame, [fadeOutStart, durationFrames], [1, 0], {
          extrapolateRight: "clamp",
        })
      : 1;

  // Word-by-word reveal animation
  if (animation === "word_reveal") {
    const words = text.split(" ");
    const framesPerWord = Math.max(4, Math.floor((durationFrames * 0.5) / words.length));

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
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: `0 ${fontSize * 0.3}px`,
            opacity: fadeOut,
          }}
        >
          {words.map((word, i) => {
            const wordStart = i * framesPerWord;
            const wordProgress = interpolate(
              relativeFrame,
              [wordStart, wordStart + 6],
              [0, 1],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
            );
            const wordY = interpolate(
              relativeFrame,
              [wordStart, wordStart + 6],
              [20, 0],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
            );

            return (
              <span
                key={i}
                style={{
                  fontSize,
                  fontFamily,
                  fontWeight: 800,
                  color,
                  opacity: wordProgress,
                  transform: `translateY(${wordY}px)`,
                  textShadow: `0 0 8px rgba(0,0,0,0.8), 0 2px 4px rgba(0,0,0,0.9)`,
                  WebkitTextStroke: `1px rgba(0,0,0,0.3)`,
                  lineHeight: 1.3,
                  display: "inline-block",
                }}
              >
                {word}
              </span>
            );
          })}
        </div>
      </div>
    );
  }

  let opacity = 1;
  let translateY = 0;
  let scale = 1;
  let displayText = text;

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
          fontWeight: 800,
          color,
          opacity,
          transform: `translateY(${translateY}px) scale(${scale})`,
          textAlign: "center",
          textShadow: `0 0 8px rgba(0,0,0,0.8), 0 2px 4px rgba(0,0,0,0.9)`,
          WebkitTextStroke: `1px rgba(0,0,0,0.3)`,
          lineHeight: 1.25,
        }}
      >
        {displayText}
      </div>
    </div>
  );
};
