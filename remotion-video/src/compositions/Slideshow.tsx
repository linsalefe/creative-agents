import React from "react";
import { useVideoConfig, Sequence } from "remotion";
import { AnimatedText } from "../components/AnimatedText";
import { CTAButton } from "../components/CTAButton";
import { TransitionSlide } from "../components/TransitionSlide";
import type { SlideshowProps } from "../types";

const FONT_SIZES = { grande: 64, medio: 48, pequeno: 32 } as const;

export const Slideshow: React.FC<SlideshowProps> = ({
  duracao_segundos,
  fps,
  cor_primaria,
  cor_texto,
  fonte,
  textos,
  slides,
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

      {/* Dark overlay */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width,
          height,
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.4) 100%)",
          pointerEvents: "none",
        }}
      />

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
    </div>
  );
};
