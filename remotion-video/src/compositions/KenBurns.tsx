import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Sequence,
  Img,
} from "remotion";
import { AnimatedText } from "../components/AnimatedText";
import { CTAButton } from "../components/CTAButton";
import type { KenBurnsProps } from "../types";

const FONT_SIZES = { grande: 64, medio: 48, pequeno: 32 } as const;

export const KenBurns: React.FC<KenBurnsProps> = ({
  duracao_segundos,
  fps,
  cor_primaria,
  cor_texto,
  fonte,
  textos,
  imagem_url,
  zoom_inicio,
  zoom_fim,
  direcao_pan,
}) => {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames } = useVideoConfig();

  // Ken Burns: zoom + pan
  const scale = interpolate(frame, [0, durationInFrames], [zoom_inicio, zoom_fim], {
    extrapolateRight: "clamp",
  });

  const panAmount = 40; // pixels
  let translateX = 0;
  let translateY = 0;

  switch (direcao_pan) {
    case "left":
      translateX = interpolate(frame, [0, durationInFrames], [0, -panAmount]);
      break;
    case "right":
      translateX = interpolate(frame, [0, durationInFrames], [0, panAmount]);
      break;
    case "up":
      translateY = interpolate(frame, [0, durationInFrames], [0, -panAmount]);
      break;
    case "down":
      translateY = interpolate(frame, [0, durationInFrames], [0, panAmount]);
      break;
  }

  // Find the last texto as CTA (appears in last 3 seconds)
  const ctaThreshold = duracao_segundos - 3;
  const ctaTexto = textos.find((t) => t.tempo_inicio >= ctaThreshold);
  const normalTextos = textos.filter((t) => t.tempo_inicio < ctaThreshold);

  return (
    <div style={{ width, height, overflow: "hidden", backgroundColor: "#000" }}>
      {/* Background image with Ken Burns effect */}
      {imagem_url && (
        <div
          style={{
            width,
            height,
            transform: `scale(${scale}) translate(${translateX}px, ${translateY}px)`,
            transformOrigin: "center center",
          }}
        >
          <Img
            src={imagem_url}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
      )}

      {/* Dark overlay for text readability */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width,
          height,
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.1) 40%, rgba(0,0,0,0.1) 60%, rgba(0,0,0,0.5) 100%)",
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

      {/* CTA button */}
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
