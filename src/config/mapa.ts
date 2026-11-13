import { LIMITES_PE } from './app';

export type IdMapaBase = 'satelite' | 'ruas';

export interface MapaBase {
  rotulo: string;
  url: string;
  atribuicao: string;
  zoomMaximoNativo: number;
}

/** Provedores do mapa base (gratuitos, sem chave). */
export const MAPAS_BASE: Record<IdMapaBase, MapaBase> = {
  satelite: {
    rotulo: 'Satélite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    atribuicao: 'Imagens &copy; Esri, Maxar, Earthstar Geographics',
    zoomMaximoNativo: 18,
  },
  ruas: {
    rotulo: 'Ruas',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    atribuicao: '&copy; colaboradores do <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    zoomMaximoNativo: 19,
  },
};

export const MAPA = {
  baseInicial: 'satelite' as IdMapaBase,
  /** Centro aproximado de Pernambuco. */
  centro: {
    lat: (LIMITES_PE.sul + LIMITES_PE.norte) / 2,
    lon: (LIMITES_PE.oeste + LIMITES_PE.leste) / 2,
  },
  /** Zoom em que o estado inteiro cabe na largura de um celular. */
  zoomInicial: 6,
  zoomMinimo: 6,
  /** Zoom usado ao focar na posição do usuário (nível de bairro). */
  zoomUsuario: 16,
  zoomMaximo: 18,
  /** Folga, em graus, além dos limites de PE até onde o mapa pode ser arrastado. */
  folgaGraus: 0.6,
} as const;
