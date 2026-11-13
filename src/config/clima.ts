import type { Coordenada } from '@/domain/geografia';

export type IntensidadeChuva = 'sem-chuva' | 'fraca' | 'moderada' | 'forte' | 'muito-forte';

export interface FaixaChuva {
  intensidade: IntensidadeChuva;
  rotulo: string;
  /** A faixa vale para volumes abaixo deste valor, em mm por hora. */
  abaixoDe: number;
}

/**
 * Classificação da chuva pelo volume em uma hora (mm/h). Limiares de uso comum
 * em meteorologia operacional; são parâmetros do protótipo, fáceis de ajustar.
 */
export const FAIXAS_CHUVA: readonly FaixaChuva[] = [
  { intensidade: 'sem-chuva', rotulo: 'Sem chuva', abaixoDe: 0.1 },
  { intensidade: 'fraca', rotulo: 'Chuva fraca', abaixoDe: 5 },
  { intensidade: 'moderada', rotulo: 'Chuva moderada', abaixoDe: 25 },
  { intensidade: 'forte', rotulo: 'Chuva forte', abaixoDe: 50 },
  { intensidade: 'muito-forte', rotulo: 'Chuva muito forte', abaixoDe: Infinity },
];

/** Chuvas que podem ser simuladas no modo demonstração (aba Sobre). */
export type ChuvaDeTeste = 'fraca' | 'moderada' | 'forte';

/**
 * Valores usados em cada chuva de teste: volume por hora (dentro da faixa da
 * intensidade) e probabilidade exibida. São valores de demonstração, não medições.
 */
export const CHUVAS_DE_TESTE: Record<ChuvaDeTeste, { rotulo: string; mmPorHora: number; probabilidade: number }> = {
  fraca: { rotulo: 'Chuva fraca', mmPorHora: 2, probabilidade: 60 },
  moderada: { rotulo: 'Chuva moderada', mmPorHora: 10, probabilidade: 80 },
  forte: { rotulo: 'Chuva forte', mmPorHora: 30, probabilidade: 95 },
};

export const CLIMA = {
  urlPrevisao: 'https://api.open-meteo.com/v1/forecast',
  /** Janela resumida no painel. */
  horasDePrevisao: 3,
  /** Intervalo entre atualizações automáticas. */
  intervaloAtualizacaoMs: 10 * 60_000,
  /** Nova tentativa depois de uma falha. */
  intervaloAposFalhaMs: 60_000,
  /** Tempo máximo de espera pela resposta. */
  tempoLimiteMs: 12_000,
  /**
   * Casas decimais usadas na coordenada da consulta (2 ≈ 1 km). Evita refazer a
   * consulta a cada pequeno deslocamento; a previsão não muda nessa escala.
   */
  casasDaCoordenada: 2,
  /** Local usado quando não há localização utilizável. */
  localPadrao: { nome: 'Recife', lat: -8.0476, lon: -34.877 } satisfies Coordenada & { nome: string },
} as const;
