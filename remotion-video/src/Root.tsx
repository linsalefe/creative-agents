import React from "react";
import { Composition } from "remotion";
import { KenBurns } from "./compositions/KenBurns";
import { Slideshow } from "./compositions/Slideshow";
import { MotionGraphics } from "./compositions/MotionGraphics";
import type { KenBurnsProps, SlideshowProps, MotionGraphicsProps } from "./types";

const defaultTextos = [
  {
    texto: "Transforme sua carreira",
    tempo_inicio: 0,
    tempo_fim: 3,
    animacao: "scale_in" as const,
    posicao: "center" as const,
    tamanho: "grande" as const,
  },
  {
    texto: "Método comprovado",
    tempo_inicio: 3,
    tempo_fim: 6,
    animacao: "slide_up" as const,
    posicao: "center" as const,
    tamanho: "medio" as const,
  },
  {
    texto: "Inscreva-se agora",
    tempo_inicio: 7,
    tempo_fim: 10,
    animacao: "fade_in" as const,
    posicao: "bottom" as const,
    tamanho: "grande" as const,
  },
];

const kenBurnsDefaults: KenBurnsProps = {
  tipo: "ken_burns",
  duracao_segundos: 10,
  fps: 30,
  width: 1080,
  height: 1920,
  cor_primaria: "#6C3AED",
  cor_secundaria: "#EC4899",
  cor_texto: "#FFFFFF",
  fonte: "Inter",
  textos: defaultTextos,
  imagem_url: "https://via.placeholder.com/1080x1920",
  zoom_inicio: 1.0,
  zoom_fim: 1.3,
  direcao_pan: "right",
};

const slideshowDefaults: SlideshowProps = {
  tipo: "slideshow",
  duracao_segundos: 12,
  fps: 30,
  width: 1080,
  height: 1920,
  cor_primaria: "#6C3AED",
  cor_secundaria: "#EC4899",
  cor_texto: "#FFFFFF",
  fonte: "Inter",
  textos: defaultTextos,
  slides: [
    { imagem_url: "https://via.placeholder.com/1080x1920/6C3AED/FFFFFF", duracao: 4, transicao: "fade" },
    { imagem_url: "https://via.placeholder.com/1080x1920/EC4899/FFFFFF", duracao: 4, transicao: "slide_left" },
    { imagem_url: "https://via.placeholder.com/1080x1920/3B82F6/FFFFFF", duracao: 4, transicao: "zoom_in" },
  ],
};

const motionGraphicsDefaults: MotionGraphicsProps = {
  tipo: "motion_graphics",
  duracao_segundos: 10,
  fps: 30,
  width: 1080,
  height: 1920,
  cor_primaria: "#6C3AED",
  cor_secundaria: "#EC4899",
  cor_texto: "#FFFFFF",
  fonte: "Inter",
  textos: defaultTextos,
  background_tipo: "gradiente",
  elementos_decorativos: true,
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Stories / Reels (9:16) */}
      <Composition
        id="KenBurnsVideo"
        component={KenBurns}
        durationInFrames={300}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={kenBurnsDefaults}
      />
      <Composition
        id="SlideshowVideo"
        component={Slideshow}
        durationInFrames={360}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={slideshowDefaults}
      />
      <Composition
        id="MotionGraphicsVideo"
        component={MotionGraphics}
        durationInFrames={300}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={motionGraphicsDefaults}
      />

      {/* Feed (1:1) */}
      <Composition
        id="KenBurnsVideoFeed"
        component={KenBurns}
        durationInFrames={300}
        fps={30}
        width={1080}
        height={1080}
        defaultProps={{ ...kenBurnsDefaults, width: 1080, height: 1080 }}
      />
      <Composition
        id="SlideshowVideoFeed"
        component={Slideshow}
        durationInFrames={360}
        fps={30}
        width={1080}
        height={1080}
        defaultProps={{ ...slideshowDefaults, width: 1080, height: 1080 }}
      />
      <Composition
        id="MotionGraphicsVideoFeed"
        component={MotionGraphics}
        durationInFrames={300}
        fps={30}
        width={1080}
        height={1080}
        defaultProps={{ ...motionGraphicsDefaults, width: 1080, height: 1080 }}
      />
    </>
  );
};
