export interface VideoTextOverlay {
  texto: string;
  tempo_inicio: number;
  tempo_fim: number;
  animacao: "fade_in" | "slide_up" | "typewriter" | "scale_in";
  posicao: "top" | "center" | "bottom";
  tamanho: "grande" | "medio" | "pequeno";
}

export interface VideoSlide {
  imagem_url: string;
  duracao: number;
  transicao: "fade" | "slide_left" | "slide_right" | "zoom_in";
}

export interface KenBurnsProps {
  tipo: string;
  duracao_segundos: number;
  fps: number;
  width: number;
  height: number;
  cor_primaria: string;
  cor_secundaria: string;
  cor_texto: string;
  fonte: string;
  textos: VideoTextOverlay[];
  imagem_url?: string;
  zoom_inicio: number;
  zoom_fim: number;
  direcao_pan: "left" | "right" | "up" | "down";
}

export interface SlideshowProps {
  tipo: string;
  duracao_segundos: number;
  fps: number;
  width: number;
  height: number;
  cor_primaria: string;
  cor_secundaria: string;
  cor_texto: string;
  fonte: string;
  textos: VideoTextOverlay[];
  slides: VideoSlide[];
}

export interface MotionGraphicsProps {
  tipo: string;
  duracao_segundos: number;
  fps: number;
  width: number;
  height: number;
  cor_primaria: string;
  cor_secundaria: string;
  cor_texto: string;
  fonte: string;
  textos: VideoTextOverlay[];
  background_tipo: "gradiente" | "solido" | "imagem";
  elementos_decorativos: boolean;
}
