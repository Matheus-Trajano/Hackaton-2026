import { CLIMA } from '@/config/clima';
import { faixaDaClasse } from '@/config/inclinacao';
import { RISCO } from '@/config/risco';
import type { EstadoRisco } from '@/types';
import type { ResumoClima } from './clima';
import { grausParaExibir, type Inclinacao } from './inclinacao';

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
}

const JANELA = `nas próximas ${CLIMA.horasDePrevisao} h`;

function descreverInclinacao(inclinacao: Inclinacao): string {
  const rotulo = faixaDaClasse(inclinacao.classe).rotulo.toLowerCase();
  return `Seu setor tem inclinação de ${grausParaExibir(inclinacao)}° (${inclinacao.classe === 'normal' ? 'faixa normal' : `risco ${rotulo}`})`;
}

/**
 * Motor de risco: cruza a inclinação do setor de 100 m em que o usuário está
 * com a previsão de chuva.
 *
 * | Inclinação do setor              | Chuva significativa | Sem chuva significativa | Previsão indisponível |
 * |----------------------------------|---------------------|-------------------------|-----------------------|
 * | alta (20° a 30°) ou muito alta   | risco (agravado)    | risco                   | risco                 |
 * | normal (menos de 20°)            | seguro              | seguro                  | seguro                |
 *
 * O estado `atencao` não é mais produzido pelo cálculo; existe só no modo demonstração.
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
    return { estado: 'indefinido', titulo: 'Risco ainda não avaliado', texto, chuvaAgrava: false };
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
      ? { estado: 'risco', titulo: 'Você está em risco!', texto: `${relevo} e ${previsao}.`, chuvaAgrava }
      : {
          estado: 'risco',
          titulo: 'Você está em área de risco',
          texto: `${relevo}; ${previsao}. Mantenha atenção.`,
          chuvaAgrava,
        };
  }

  return {
    estado: 'seguro',
    titulo: 'Você está em área segura',
    texto: clima ? `${relevo} e ${previsao}.` : `${relevo}.`,
    chuvaAgrava,
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
      };
    case 'atencao':
      return {
        estado,
        titulo: 'Atenção',
        texto: 'Situação de atenção simulada: acompanhe os avisos e a previsão de chuva.',
        chuvaAgrava: true,
      };
    case 'seguro':
      return {
        estado,
        titulo: 'Você está em área segura',
        texto: 'Sua localização não está em área de encosta com risco no momento.',
        chuvaAgrava: false,
      };
    case 'indefinido':
      return {
        estado,
        titulo: 'Risco ainda não avaliado',
        texto: 'Aguardando sua localização e os dados de relevo e chuva.',
        chuvaAgrava: false,
      };
  }
}
