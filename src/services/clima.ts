import { CLIMA } from '@/config/clima';
import { proximasHoras, resumirClima, type HoraPrevista, type ResumoClima } from '@/domain/clima';
import type { Coordenada } from '@/domain/geografia';

/** Monta a consulta à Open-Meteo: condição atual e previsão horária, com horários em segundos (UTC). */
export function urlDoClima(ponto: Coordenada): string {
  const parametros = new URLSearchParams({
    latitude: ponto.lat.toFixed(CLIMA.casasDaCoordenada),
    longitude: ponto.lon.toFixed(CLIMA.casasDaCoordenada),
    current: 'temperature_2m',
    hourly: 'precipitation_probability,precipitation',
    // Dois dias garantem as próximas horas mesmo perto da meia-noite; o app filtra as que interessam.
    forecast_days: '2',
    timeformat: 'unixtime',
    timezone: 'UTC',
  });
  return `${CLIMA.urlPrevisao}?${parametros}`;
}

function numero(valor: unknown): number | null {
  return typeof valor === 'number' && Number.isFinite(valor) ? valor : null;
}

function lista(valor: unknown, nome: string): unknown[] {
  if (!Array.isArray(valor)) throw new Error(`Resposta do clima sem a lista "${nome}".`);
  return valor;
}

/**
 * Converte a resposta da Open-Meteo no resumo do app.
 * Lança erro se a resposta não tiver o formato esperado — o app prefere mostrar
 * "sem dados" a mostrar um número errado.
 */
export function interpretarClima(resposta: unknown, agora: Date): ResumoClima {
  if (typeof resposta !== 'object' || resposta === null) throw new Error('Resposta do clima vazia.');
  const { current, hourly } = resposta as { current?: Record<string, unknown>; hourly?: Record<string, unknown> };

  const temperatura = numero(current?.temperature_2m);
  if (temperatura === null) throw new Error('Resposta do clima sem a temperatura atual.');

  const instantes = lista(hourly?.time, 'hourly.time');
  const probabilidades = lista(hourly?.precipitation_probability, 'hourly.precipitation_probability');
  const volumes = lista(hourly?.precipitation, 'hourly.precipitation');

  const horas: HoraPrevista[] = [];
  instantes.forEach((instante, i) => {
    const segundos = numero(instante);
    const volumeMm = numero(volumes[i]);
    // Hora sem horário ou sem volume não entra no resumo.
    if (segundos === null || volumeMm === null) return;
    horas.push({ inicio: new Date(segundos * 1000), probabilidade: numero(probabilidades[i]), volumeMm });
  });

  return resumirClima(temperatura, proximasHoras(horas, agora, CLIMA.horasDePrevisao));
}

/** Busca e resume o clima do ponto. */
export async function buscarClima(
  ponto: Coordenada,
  buscar: typeof fetch = fetch,
  agora: () => Date = () => new Date(),
): Promise<ResumoClima> {
  const controle = new AbortController();
  const limite = setTimeout(() => controle.abort(), CLIMA.tempoLimiteMs);
  try {
    const resposta = await buscar(urlDoClima(ponto), { signal: controle.signal });
    if (!resposta.ok) throw new Error(`Serviço de clima respondeu ${resposta.status}.`);
    return interpretarClima(await resposta.json(), agora());
  } finally {
    clearTimeout(limite);
  }
}
