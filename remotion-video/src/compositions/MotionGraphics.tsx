import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Sequence,
  spring,
} from "remotion";
import { AnimatedText } from "../components/AnimatedText";
import { CTAButton } from "../components/CTAButton";
import { GradientBg } from "../components/GradientBg";
import type { MotionGraphicsProps } from "../types";

const FONT_SIZES = { grande: 72, medio: 52, pequeno: 36 } as const;

const DecorativeElements: React.FC<{
  corPrimaria: string;
  corSecundaria: string;
  width: number;
  height: number;
}> = ({ corPrimaria, corSecundaria, width, height }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Animated circles
  const circle1Y = interpolate(frame, [0, 300], [height * 0.2, height * 0.3], {
    extrapolateRight: "extend",
  });
  const circle1Scale = spring({ frame, fps, config: { damping: 20, stiffness: 80 } });

  const circle2X = interpolate(frame, [0, 300], [width * 0.8, width * 0.7], {
    extrapolateRight: "extend",
  });

  // Animated lines
  const lineWidth = interpolate(frame, [10, 40], [0, width * 0.3], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <>
      {/* Circle 1 */}
      <div
        style={{
          position: "absolute",
          left: width * 0.1,
          top: circle1Y,
          width: 120,
          height: 120,
          borderRadius: "50%",
          border: `3px solid ${corPrimaria}40`,
          transform: `scale(${circle1Scale})`,
        }}
      />
      {/* Circle 2 */}
      <div
        style={{
          position: "absolute",
          left: circle2X,
          top: height * 0.15,
          width: 80,
          height: 80,
          borderRadius: "50%",
          backgroundColor: `${corSecundaria}20`,
          transform: `scale(${circle1Scale})`,
        }}
      />
      {/* Decorative line */}
      <div
        style={{
          position: "absolute",
          left: width * 0.1,
          top: height * 0.45,
          width: lineWidth,
          height: 3,
          backgroundColor: `${corPrimaria}60`,
          borderRadius: 2,
        }}
      />
      {/* Bottom decorative line */}
      <div
        style={{
          position: "absolute",
          right: width * 0.1,
          bottom: height * 0.3,
          width: lineWidth * 0.7,
          height: 3,
          backgroundColor: `${corSecundaria}50`,
          borderRadius: 2,
        }}
      />
    </>
  );
};

export const MotionGraphics: React.FC<MotionGraphicsProps> = ({
  duracao_segundos,
  fps,
  cor_primaria,
  cor_secundaria,
  cor_texto,
  fonte,
  textos,
  background_tipo,
  elementos_decorativos,
}) => {
  const { width, height } = useVideoConfig();

  // Find CTA text (last 3 seconds)
  const ctaThreshold = duracao_segundos - 3;
  const ctaTexto = textos.find((t) => t.tempo_inicio >= ctaThreshold);
  const normalTextos = textos.filter((t) => t.tempo_inicio < ctaThreshold);

  return (
    <div style={{ width, height, overflow: "hidden", position: "relative" }}>
      {/* Background */}
      {background_tipo === "gradiente" ? (
        <GradientBg
          colorA={cor_primaria}
          colorB={cor_secundaria}
          width={width}
          height={height}
        />
      ) : (
        <div
          style={{
            width,
            height,
            backgroundColor: cor_primaria,
            position: "absolute",
            top: 0,
            left: 0,
          }}
        />
      )}

      {/* Decorative elements */}
      {elementos_decorativos && (
        <DecorativeElements
          corPrimaria={cor_primaria}
          corSecundaria={cor_secundaria}
          width={width}
          height={height}
        />
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
            bgColor={cor_texto}
            textColor={cor_primaria}
          />
        </Sequence>
      )}
    </div>
  );
};
