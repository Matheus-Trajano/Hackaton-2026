import type { Coordenada } from './geografia';

export type ModoLocalizacao = 'gps' | 'simulado';

export type StatusLocalizacao = 'buscando' | 'ok' | 'negada' | 'indisponivel' | 'nao-suportada';

export interface EstadoLocalizacao {
  modo: ModoLocalizacao;
  status: StatusLocalizacao;
  /** Presente apenas quando `status` é `ok`. */
  posicao?: Coordenada;
  /** Margem de erro informada pelo aparelho, em metros (só no GPS). */
  precisaoMetros?: number;
  /** A posição está dentro da área atendida (Pernambuco)? */
  naCobertura: boolean;
  /** Nome do local de demonstração, no modo simulado. */
  nomeLocal?: string;
}

/** Códigos de `GeolocationPositionError`. */
const PERMISSAO_NEGADA = 1;

/** Traduz o código de erro do navegador para o status do app. */
export function statusDoErro(codigo: number): Extract<StatusLocalizacao, 'negada' | 'indisponivel'> {
  return codigo === PERMISSAO_NEGADA ? 'negada' : 'indisponivel';
}

/** A posição pode ser usada (existe e está na área de cobertura)? */
export function posicaoUtilizavel(estado: EstadoLocalizacao): estado is EstadoLocalizacao & { posicao: Coordenada } {
  return estado.status === 'ok' && estado.naCobertura && estado.posicao !== undefined;
}

/** Aviso a mostrar ao usuário; `null` quando está tudo certo. */
export function mensagemLocalizacao(estado: EstadoLocalizacao): string | null {
  switch (estado.status) {
    case 'buscando':
      return 'Obtendo sua localização…';
    case 'negada':
      return 'Permissão de localização negada. Libere o acesso no navegador ou use um local de demonstração.';
    case 'indisponivel':
      return 'Não foi possível obter sua localização.';
    case 'nao-suportada':
      return 'Este navegador não oferece localização.';
    case 'ok':
      return estado.naCobertura ? null : 'Você está fora da área de cobertura (Pernambuco).';
  }
}

/** Ex.: `-8.0153, -34.9125`. */
export function formatarCoordenada(ponto: Coordenada, casas = 4): string {
  return `${ponto.lat.toFixed(casas)}, ${ponto.lon.toFixed(casas)}`;
}
