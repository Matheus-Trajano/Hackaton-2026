import { ESCALA_ALTITUDE, type ParadaCor } from '@/config/relevo';
import type { Coordenada } from './geografia';

/** Altitude (m) codificada em um pixel Terrarium. */
export function altitudeTerrarium(r: number, g: number, b: number): number {
  return r * 256 + g + b / 256 - 32768;
}

/** Converte os pixels RGBA de um tile Terrarium em altitudes (m), uma por pixel. */
export function decodificarTerrarium(rgba: ArrayLike<number>): Float32Array {
  const altitudes = new Float32Array(Math.floor(rgba.length / 4));
  for (let i = 0; i < altitudes.length; i++) {
    const p = i * 4;
    altitudes[i] = altitudeTerrarium(rgba[p]!, rgba[p + 1]!, rgba[p + 2]!);
  }
  return altitudes;
}

/**
 * Cor do mapa de calor para uma altitude, interpolando entre as paradas da escala.
 * Abaixo da primeira parada usa a primeira cor; acima da última, a última.
 */
export function corDaAltitude(
  altitude: number,
  escala: readonly ParadaCor[] = ESCALA_ALTITUDE,
): [number, number, number] {
  const primeira = escala[0]!;
  if (altitude <= primeira.altitude) return [...primeira.cor];
  for (let i = 1; i < escala.length; i++) {
    const acima = escala[i]!;
    if (altitude <= acima.altitude) {
      const abaixo = escala[i - 1]!;
      const t = (altitude - abaixo.altitude) / (acima.altitude - abaixo.altitude);
      return [0, 1, 2].map((c) => Math.round(abaixo.cor[c]! + (acima.cor[c]! - abaixo.cor[c]!) * t)) as [
        number,
        number,
        number,
      ];
    }
  }
  return [...escala[escala.length - 1]!.cor];
}

/**
 * Gera os pixels RGBA do mapa de calor de um tile.
 * Altitudes no nível do mar ou abaixo (mar, estuários) ficam transparentes.
 */
export function colorirAltitudes(
  altitudes: ArrayLike<number>,
  escala: readonly ParadaCor[] = ESCALA_ALTITUDE,
): Uint8ClampedArray<ArrayBuffer> {
  const rgba = new Uint8ClampedArray(altitudes.length * 4);
  for (let i = 0; i < altitudes.length; i++) {
    const altitude = altitudes[i]!;
    if (altitude <= 0) continue;
    const [r, g, b] = corDaAltitude(altitude, escala);
    const p = i * 4;
    rgba[p] = r;
    rgba[p + 1] = g;
    rgba[p + 2] = b;
    rgba[p + 3] = 255;
  }
  return rgba;
}

export interface PosicaoNoTile {
  z: number;
  /** Coluna e linha do tile. */
  x: number;
  y: number;
  /** Pixel dentro do tile (0 a tamanho − 1). */
  px: number;
  py: number;
}

/** Localiza uma coordenada na grade de tiles Web Mercator (padrão XYZ). */
export function posicaoNoTile(ponto: Coordenada, z: number, tamanho = 256): PosicaoNoTile {
  const n = 2 ** z;
  const latRad = (ponto.lat * Math.PI) / 180;
  const xGlobal = ((ponto.lon + 180) / 360) * n;
  const yGlobal = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;
  const x = Math.min(n - 1, Math.max(0, Math.floor(xGlobal)));
  const y = Math.min(n - 1, Math.max(0, Math.floor(yGlobal)));
  const limitar = (v: number) => Math.min(tamanho - 1, Math.max(0, Math.floor(v)));
  return { z, x, y, px: limitar((xGlobal - x) * tamanho), py: limitar((yGlobal - y) * tamanho) };
}
