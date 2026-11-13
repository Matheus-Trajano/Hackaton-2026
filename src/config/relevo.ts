/** Fonte e apresentação dos dados de altitude. */
export const RELEVO = {
  /** AWS Terrain Tiles, formato Terrarium (PNG com a altitude codificada em RGB). */
  urlTiles: 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png',
  atribuicao: 'Relevo: Mapzen / AWS Terrain Tiles',
  tamanhoTile: 256,
  /** Maior zoom buscado na fonte (~10 m por pixel em PE); acima disso o tile é ampliado. */
  zoomMaximoNativo: 14,
  /** Zoom usado para consultar a altitude de um ponto. */
  zoomConsulta: 14,
  /** Opacidade do mapa de calor sobre o mapa base. */
  opacidade: 0.6,
  /** Quantos tiles de altitude ficam guardados em memória. */
  tilesEmCache: 96,
} as const;

export interface ParadaCor {
  /** Altitude, em metros. */
  altitude: number;
  /** Cor RGB. */
  cor: readonly [number, number, number];
}

/**
 * Escala de cores do mapa de calor: claro = baixo, vermelho = alto.
 * As paradas não são lineares de propósito: os morros do litoral têm dezenas de
 * metros e as serras do interior passam de 1.000 m; uma escala linear deixaria o
 * litoral todo com a mesma cor.
 */
export const ESCALA_ALTITUDE: readonly ParadaCor[] = [
  { altitude: 0, cor: [255, 255, 229] },
  { altitude: 20, cor: [255, 241, 168] },
  { altitude: 50, cor: [254, 196, 79] },
  { altitude: 100, cor: [253, 141, 60] },
  { altitude: 200, cor: [240, 59, 32] },
  { altitude: 500, cor: [189, 0, 38] },
  { altitude: 1000, cor: [103, 0, 13] },
];
