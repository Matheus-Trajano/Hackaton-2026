import { APP, LIMITES_PE } from '@/config/app';
import type { Coordenada, Limites } from './geografia';

/**
 * Grade de setores: quadrados de 100 m × 100 m alinhados ao norte, contados a
 * partir do canto sudoeste da área de cobertura (linha 0, coluna 0).
 *
 * Simplificação: um grau de longitude é convertido em metros usando a latitude
 * média de Pernambuco. A largura real dos setores varia menos de 0,5% entre o
 * sul e o norte do estado.
 */
export const METROS_POR_GRAU_LAT = 110_574;
const LATITUDE_REFERENCIA = (LIMITES_PE.sul + LIMITES_PE.norte) / 2;
export const METROS_POR_GRAU_LON = 111_320 * Math.cos((LATITUDE_REFERENCIA * Math.PI) / 180);

const PASSO_LAT = APP.tamanhoSetorMetros / METROS_POR_GRAU_LAT;
const PASSO_LON = APP.tamanhoSetorMetros / METROS_POR_GRAU_LON;

export interface Setor {
  /** Cresce de sul para norte. */
  linha: number;
  /** Cresce de oeste para leste. */
  coluna: number;
}

/** Setor que contém a coordenada. */
export function setorDe(ponto: Coordenada): Setor {
  return {
    linha: Math.floor((ponto.lat - LIMITES_PE.sul) / PASSO_LAT),
    coluna: Math.floor((ponto.lon - LIMITES_PE.oeste) / PASSO_LON),
  };
}

export function limitesDoSetor(setor: Setor): Limites {
  const sul = LIMITES_PE.sul + setor.linha * PASSO_LAT;
  const oeste = LIMITES_PE.oeste + setor.coluna * PASSO_LON;
  return { sul, norte: sul + PASSO_LAT, oeste, leste: oeste + PASSO_LON };
}

export function centroDoSetor(setor: Setor): Coordenada {
  const l = limitesDoSetor(setor);
  return { lat: (l.sul + l.norte) / 2, lon: (l.oeste + l.leste) / 2 };
}

/** Identificador legível, ex.: `L1234-C5678`. */
export function idDoSetor(setor: Setor): string {
  return `L${setor.linha}-C${setor.coluna}`;
}

export function mesmoSetor(a: Setor, b: Setor): boolean {
  return a.linha === b.linha && a.coluna === b.coluna;
}

/**
 * Setores que tocam a área informada (recortada à área de cobertura).
 * Devolve `null` se forem mais que `maximo` — sinal de que o mapa está afastado demais.
 */
export function setoresNaArea(area: Limites, maximo: number): Setor[] | null {
  const sul = Math.max(area.sul, LIMITES_PE.sul);
  const norte = Math.min(area.norte, LIMITES_PE.norte);
  const oeste = Math.max(area.oeste, LIMITES_PE.oeste);
  const leste = Math.min(area.leste, LIMITES_PE.leste);
  if (sul > norte || oeste > leste) return [];

  const inicio = setorDe({ lat: sul, lon: oeste });
  const fim = setorDe({ lat: norte, lon: leste });
  const linhas = fim.linha - inicio.linha + 1;
  const colunas = fim.coluna - inicio.coluna + 1;
  if (linhas * colunas > maximo) return null;

  const setores: Setor[] = [];
  for (let linha = inicio.linha; linha <= fim.linha; linha++) {
    for (let coluna = inicio.coluna; coluna <= fim.coluna; coluna++) setores.push({ linha, coluna });
  }
  return setores;
}
