import { APP } from '@/config/app';
import { LIMITES_INCLINACAO, type ClasseInclinacao } from '@/config/inclinacao';
import type { Coordenada } from './geografia';
import { limitesDoSetor, type Setor } from './grade';

export interface Inclinacao {
  /** Subida em metros a cada 100 m na horizontal. */
  percentual: number;
  /** O mesmo valor, como ângulo em graus. */
  graus: number;
  classe: ClasseInclinacao;
}

/** Classe pelo ângulo em graus: normal < 15° · alto 15° a < 45° · muito alto ≥ 45°. */
export function classificarInclinacao(graus: number): ClasseInclinacao {
  if (graus < LIMITES_INCLINACAO.alto) return 'normal';
  if (graus < LIMITES_INCLINACAO.muitoAlto) return 'alto';
  return 'muito-alto';
}

/**
 * Inclinação pelo método de Horn, a partir de 9 altitudes em grade 3 × 3,
 * informadas linha a linha, de norte para sul e de oeste para leste:
 *
 *     a b c
 *     d e f
 *     g h i
 *
 * `espacamento` é a distância, em metros, entre pontos vizinhos.
 */
export function inclinacaoHorn(altitudes: readonly number[], espacamento: number): Inclinacao {
  if (altitudes.length !== 9) throw new Error('São necessárias exatamente 9 altitudes.');
  const [a, b, c, d, , f, g, h, i] = altitudes as [number, number, number, number, number, number, number, number, number];
  const lesteOeste = (c + 2 * f + i - (a + 2 * d + g)) / (8 * espacamento);
  const norteSul = (a + 2 * b + c - (g + 2 * h + i)) / (8 * espacamento);
  const tangente = Math.hypot(lesteOeste, norteSul);
  const graus = (Math.atan(tangente) * 180) / Math.PI;
  return { percentual: tangente * 100, graus, classe: classificarInclinacao(graus) };
}

/** Os 9 pontos de amostra do setor: cantos, meios das bordas e centro (norte → sul, oeste → leste). */
export function pontosDeAmostra(setor: Setor): Coordenada[] {
  const l = limitesDoSetor(setor);
  const lats = [l.norte, (l.norte + l.sul) / 2, l.sul];
  const lons = [l.oeste, (l.oeste + l.leste) / 2, l.leste];
  return lats.flatMap((lat) => lons.map((lon) => ({ lat, lon })));
}

/** Inclinação de um setor, consultando a altitude dos seus 9 pontos de amostra. */
export async function inclinacaoDoSetor(
  setor: Setor,
  consultar: (ponto: Coordenada) => Promise<number>,
): Promise<Inclinacao> {
  // Chama com um único argumento: `map` também passa índice e lista, que uma função de
  // consulta com parâmetros opcionais (como `consultarAltitude`) interpretaria como opções.
  const altitudes = await Promise.all(pontosDeAmostra(setor).map((ponto) => consultar(ponto)));
  return inclinacaoHorn(altitudes, APP.tamanhoSetorMetros / 2);
}
