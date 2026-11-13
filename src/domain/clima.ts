import {
  CHUVAS_DE_TESTE,
  FAIXAS_CHUVA,
  type ChuvaDeTeste,
  type FaixaChuva,
  type IntensidadeChuva,
} from '@/config/clima';

/** Previsão de uma hora. */
export interface HoraPrevista {
  /** Início da hora. */
  inicio: Date;
  /** Probabilidade de chuva (0–100); `null` quando a fonte não informa. */
  probabilidade: number | null;
  /** Volume previsto na hora, em mm. */
  volumeMm: number;
}

/** Resumo do clima exibido no painel superior. */
export interface ResumoClima {
  /** Temperatura atual, em °C; `null` quando não há medição (chuva de teste sem previsão real). */
  temperatura: number | null;
  /** Maior probabilidade de chuva nas próximas horas (0–100); `null` se a fonte não informar. */
  probabilidadeChuva: number | null;
  /** Soma do volume previsto nas próximas horas, em mm. */
  volumeMm: number;
  /** Maior volume previsto em uma única hora, em mm. */
  picoMmPorHora: number;
  /** Intensidade correspondente ao pico. */
  intensidade: IntensidadeChuva;
  /** Rótulo da intensidade, ex.: "Chuva forte". */
  rotuloIntensidade: string;
  /** As horas consideradas, em ordem. */
  horas: HoraPrevista[];
}

export function faixaDaChuva(mmPorHora: number): FaixaChuva {
  return FAIXAS_CHUVA.find((faixa) => mmPorHora < faixa.abaixoDe) ?? FAIXAS_CHUVA[FAIXAS_CHUVA.length - 1]!;
}

/**
 * Das horas previstas, escolhe as próximas `quantidade` a partir de agora:
 * a hora em andamento e as seguintes.
 */
export function proximasHoras(horas: readonly HoraPrevista[], agora: Date, quantidade: number): HoraPrevista[] {
  const umaHora = 3_600_000;
  return horas
    .filter((hora) => hora.inicio.getTime() + umaHora > agora.getTime())
    .sort((a, b) => a.inicio.getTime() - b.inicio.getTime())
    .slice(0, quantidade);
}

/** Resume as horas informadas. Exige ao menos uma hora. */
export function resumirClima(temperatura: number | null, horas: readonly HoraPrevista[]): ResumoClima {
  if (horas.length === 0) throw new Error('Previsão sem horas futuras.');
  const probabilidades = horas.map((h) => h.probabilidade).filter((p): p is number => p !== null);
  const picoMmPorHora = Math.max(...horas.map((h) => h.volumeMm));
  const faixa = faixaDaChuva(picoMmPorHora);
  return {
    temperatura,
    probabilidadeChuva: probabilidades.length > 0 ? Math.max(...probabilidades) : null,
    volumeMm: horas.reduce((soma, h) => soma + h.volumeMm, 0),
    picoMmPorHora,
    intensidade: faixa.intensidade,
    rotuloIntensidade: faixa.rotulo,
    horas: [...horas],
  };
}

/**
 * Previsão simulada para o modo demonstração: a chuva escolhida em cada uma das
 * próximas `quantidade` horas. A temperatura não é simulada: usa a real, se houver.
 */
export function climaDeTeste(
  chuva: ChuvaDeTeste,
  temperatura: number | null,
  agora: Date,
  quantidade: number,
): ResumoClima {
  const { mmPorHora, probabilidade } = CHUVAS_DE_TESTE[chuva];
  const umaHora = 3_600_000;
  const inicio = Math.floor(agora.getTime() / umaHora) * umaHora;
  const horas = Array.from({ length: quantidade }, (_, i) => ({
    inicio: new Date(inicio + i * umaHora),
    probabilidade,
    volumeMm: mmPorHora,
  }));
  return resumirClima(temperatura, horas);
}
