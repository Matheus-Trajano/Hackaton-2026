import { formatarGraus } from '@/domain/inclinacao';
import { CLIMA } from '@/config/clima';
import { faixaDaClasse } from '@/config/inclinacao';
import { RISCO } from '@/config/risco';
import type { EstadoRisco } from '@/types';
import type { ResumoClima } from './clima';
import type { Inclinacao } from './inclinacao';

/** Situação da inclinação do setor do usuário. */
export type InclinacaoParaRisco =
  | { status: 'sem-posicao'; aviso?: string | null }
  | { status: 'carregando' }
  | { status: 'erro' }
  | { status: 'ok'; inclinacao: Inclinacao };

/** Situação da previsão de chuva para o local do usuário. */
export type ChuvaParaRisco = { status: 'carregando' } | { status: 'erro' } | { status: 'ok'; clima: ResumoClima };

export interface AvaliacaoRisco {
  estado: EstadoRisco;
  titulo: string;
  texto: string;
  /** Há chuva significativa prevista somando-se à inclinação? */
  chuvaAgrava: boolean;
  /** Tipo de perigo avaliado; `null` quando não há perigo identificado ou avaliação. */
  perigo: Perigo | null;
}

export type Perigo = 'deslizamento' | 'alagamento';

const JANELA = `nas próximas ${CLIMA.horasDePrevisao} h`;

function descreverInclinacao(inclinacao: Inclinacao): string {
  const rotulo = faixaDaClasse(inclinacao.classe).rotulo.toLowerCase();
  return `Seu setor tem inclinação de ${formatarGraus(inclinacao.graus)} (${rotulo})`;
}

/**
 * Motor de risco: cruza a inclinação do setor de 100 m em que o usuário está
 * com a previsão de chuva.
 *
 * | Inclinação do setor | Chuva significativa | Sem chuva significativa | Previsão indisponível |
 * |---------------------|---------------------|-------------------------|-----------------------|
 * | alta ou muito alta  | risco (agravado)    | risco                   | risco                 |
 * | normal (< 15°)      | alerta de alagamento | seguro                 | seguro                |
 *
 * O alerta de alagamento usa o estado `atencao`, com `perigo: 'alagamento'`. Sem
 * previsão disponível não há alerta de alagamento: ele depende só da chuva, e
 * alertar todo terreno plano a cada falha da previsão tiraria o valor do aviso.
 *
 * Sem inclinação conhecida, o resultado é `indefinido` — o app não supõe segurança.
 */
export function avaliarRisco(inclinacao: InclinacaoParaRisco, chuva: ChuvaParaRisco): AvaliacaoRisco {
  if (inclinacao.status !== 'ok') {
    const texto =
      inclinacao.status === 'carregando'
        ? 'Calculando a inclinação do seu setor…'
        : inclinacao.status === 'erro'
          ? 'Não foi possível obter os dados de relevo do seu setor.'
          : (inclinacao.aviso ?? 'Aguardando sua localização.');
    return { estado: 'indefinido', titulo: 'Risco ainda não avaliado', texto, chuvaAgrava: false, perigo: null };
  }

  const { classe } = inclinacao.inclinacao;
  const relevo = descreverInclinacao(inclinacao.inclinacao);
  const clima = chuva.status === 'ok' ? chuva.clima : null;
  const chuvaAgrava = clima !== null && RISCO.chuvaSignificativa.includes(clima.intensidade);
  const previsao = clima
    ? chuvaAgrava
      ? `há previsão de ${clima.rotuloIntensidade.toLowerCase()} ${JANELA}`
      : `não há previsão de chuva significativa ${JANELA}`
    : chuva.status === 'carregando'
      ? 'a previsão do tempo ainda está sendo consultada'
      : 'a previsão do tempo está indisponível';

  if (RISCO.classesDeRisco.includes(classe)) {
    return chuvaAgrava
      ? {
          estado: 'risco',
          titulo: 'Você está em risco!',
          texto: `${relevo} e ${previsao}.`,
          chuvaAgrava,
          perigo: 'deslizamento',
        }
      : {
          estado: 'risco',
          titulo: 'Você está em área de risco',
          texto: `${relevo}; ${previsao}. Mantenha atenção.`,
          chuvaAgrava,
          perigo: 'deslizamento',
        };
  }

  // Setor de inclinação normal: não há risco de deslizamento, mas a chuva pode alagar.
  if (clima !== null && RISCO.chuvaDeAlagamento.includes(clima.intensidade)) {
    return {
      estado: 'atencao',
      titulo: 'Alerta de alagamento',
      texto: `${relevo} e ${previsao}. Pode haver alagamento.`,
      chuvaAgrava,
      perigo: 'alagamento',
    };
  }

  return {
    estado: 'seguro',
    titulo: 'Você está em área segura',
    texto: clima ? `${relevo} e ${previsao}.` : `${relevo}.`,
    chuvaAgrava,
    perigo: null,
  };
}

/** Avaliações fixas do modo demonstração (aba Sobre). */
export function avaliacaoDeDemonstracao(estado: EstadoRisco): AvaliacaoRisco {
  switch (estado) {
    case 'risco':
      return {
        estado,
        titulo: 'Você está em risco!',
        texto: 'Sua localização está em uma área de encosta com inclinação acentuada e previsão de chuva forte.',
        chuvaAgrava: true,
        perigo: 'deslizamento',
      };
    case 'atencao':
      return {
        estado,
        titulo: 'Alerta de alagamento',
        texto: 'Seu setor tem inclinação normal e há previsão de chuva forte. Pode haver alagamento.',
        chuvaAgrava: true,
        perigo: 'alagamento',
      };
    case 'seguro':
      return {
        estado,
        titulo: 'Você está em área segura',
        texto: 'Sua localização não está em área de encosta com risco no momento.',
        chuvaAgrava: false,
        perigo: null,
      };
    case 'indefinido':
      return {
        estado,
        titulo: 'Risco ainda não avaliado',
        texto: 'Aguardando sua localização e os dados de relevo e chuva.',
        chuvaAgrava: false,
        perigo: null,
      };
  }
}
