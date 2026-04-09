import React from "react";
import { useCurrentFrame, useVideoConfig, Sequence, spring } from "remotion";
import { AnimatedText } from "../components/AnimatedText";
import { CTAButton } from "../components/CTAButton";
import { TransitionSlide } from "../components/TransitionSlide";
import { ProgressBar } from "../components/ProgressBar";
import { SwipeIndicator } from "../components/SwipeIndicator";
import type { SlideshowProps } from "../types";

const FONT_SIZES = { grande: 64, medio: 48, pequeno: 32 } as const;

const SocialProof: React.FC<{
  text: string;
  color: string;
  bgColor: string;
  fps: number;
}> = ({ text, color, bgColor, fps }) => {
  const frame = useCurrentFrame();
  const entrance = spring({
    frame: frame - 8,
    fps,
    config: { damping: 14, stiffness: 100 },
  });
  if (frame < 8) return null;
  return (
    <div
      style={{
        position: "absolute",
        top: "15%",
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        zIndex: 80,
        transform: `scale(${entrance})`,
        opacity: Math.min(entrance, 1),
      }}
    >
      <div
        style={{
          backgroundColor: `${bgColor}CC`,
          backdropFilter: "blur(8px)",
          padding: "10px 28px",
          borderRadius: 50,
          fontSize: 24,
          fontFamily: "Inter, sans-serif",
          fontWeight: 700,
          color,
          letterSpacing: "0.02em",
          boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
        }}
      >
        {text}
      </div>
    </div>
  );
};

export const Slideshow: React.FC<SlideshowProps> = ({
  duracao_segundos,
  fps,
  cor_primaria,
  cor_texto,
  fonte,
  textos,
  slides,
  social_proof,
}) => {
  const { width, height } = useVideoConfig();

  // Calculate frame offsets for each slide
  let currentFrame = 0;
  const slideFrames = slides.map((slide) => {
    const durationFrames = Math.round(slide.duracao * fps);
    const from = currentFrame;
    currentFrame += durationFrames;
    return { ...slide, from, durationFrames };
  });

  // Find CTA text (last 3 seconds)
  const ctaThreshold = duracao_segundos - 3;
  const ctaTexto = textos.find((t) => t.tempo_inicio >= ctaThreshold);
  const normalTextos = textos.filter((t) => t.tempo_inicio < ctaThreshold);

  const swipeStartFrame = ctaTexto ? Math.round(ctaTexto.tempo_inicio * fps) + 10 : Math.round((duracao_segundos - 2) * fps);

  return (
    <div style={{ width, height, overflow: "hidden", backgroundColor: "#000" }}>
      {/* Slides with transitions */}
      {slideFrames.map((slide, i) => (
        <Sequence key={i} from={slide.from} durationInFrames={slide.durationFrames}>
          <TransitionSlide
            src={slide.imagem_url}
            transicao={slide.transicao}
            durationFrames={slide.durationFrames}
            width={width}
            height={height}
          />
        </Sequence>
      ))}

      {/* Dark overlay — stronger for text readability */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width,
          height,
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 25%, transparent 60%, rgba(0,0,0,0.55) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Progress bar */}
      <ProgressBar color={cor_primaria} />

      {/* Social proof badge */}
      {social_proof && (
        <SocialProof text={social_proof} color={cor_texto} bgColor={cor_primaria} fps={fps} />
      )}

      {/* Text overlays */}
      {normalTextos.map((texto, i) => {
        const startFrame = Math.round(texto.tempo_inicio * fps);
        const endFrame = Math.round(texto.tempo_fim * fps);
        return (
          <Sequence key={i} from={startFrame} durationInFrames={endFrame - startFrame}>
            <AnimatedText
              text={texto.texto}
              animation={texto.animacao}
              startFrame={0}
              durationFrames={endFrame - startFrame}
              fontSize={FONT_SIZES[texto.tamanho]}
              color={cor_texto}
              position={texto.posicao}
              fontFamily={fonte}
            />
          </Sequence>
        );
      })}

      {/* CTA */}
      {ctaTexto && (
        <Sequence
          from={Math.round(ctaTexto.tempo_inicio * fps)}
          durationInFrames={Math.round((ctaTexto.tempo_fim - ctaTexto.tempo_inicio) * fps)}
        >
          <CTAButton
            text={ctaTexto.texto}
            startFrame={0}
            durationFrames={Math.round((ctaTexto.tempo_fim - ctaTexto.tempo_inicio) * fps)}
            bgColor={cor_primaria}
            textColor={cor_texto}
          />
        </Sequence>
      )}

      {/* Swipe indicator */}
      <SwipeIndicator color={cor_texto} startFrame={swipeStartFrame} />
    </div>
  );
};
