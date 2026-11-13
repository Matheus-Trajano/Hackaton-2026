/**
 * Fonte e apresentação dos dados de altitude.
 *
 * O app lê tiles no formato Terrarium (PNG com a altitude codificada em RGB).
 * A fonte padrão (AWS Terrain Tiles) é um modelo de SUPERFÍCIE: inclui prédios
 * e copas de árvores. Para usar o relevo natural do solo, gere tiles a partir
 * de um modelo digital do TERRENO e informe o endereço em `VITE_RELEVO_URL`
 * (passo a passo em docs/RELEVO.md).
 */
export interface FonteRelevo {
  /** Endereço dos tiles, com `{z}`, `{x}` e `{y}`. */
  urlTiles: string;
  /** Nome exibido na aba Sobre. */
  nome: string;
  /** Crédito exibido no canto do mapa. */
  atribuicao: string;
  /** `superficie` inclui construções e vegetação; `terreno` é o solo nu. */
  tipo: 'superficie' | 'terreno';
  /** Maior zoom existente na fonte; acima disso o tile é ampliado. */
  zoomMaximoNativo: number;
  /** Preenchido quando a configuração informada é inválida e foi ignorada. */
  avisoConfiguracao?: string;
}

export const FONTE_PADRAO: FonteRelevo = {
  urlTiles: 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png',
  nome: 'AWS Terrain Tiles (SRTM, 30 m)',
  atribuicao: 'Relevo: Mapzen / AWS Terrain Tiles',
  tipo: 'superficie',
  zoomMaximoNativo: 14,
};

/** Zoom máximo assumido para tiles próprios (o padrão de scripts/gerar_tiles_relevo.py). */
export const ZOOM_PADRAO_TILES_PROPRIOS = 13;

/**
 * Decide a fonte a partir das variáveis de ambiente (definidas no build):
 * - `VITE_RELEVO_URL`: endereço dos tiles de terreno, ex. `https://exemplo.com/relevo/{z}/{x}/{y}.png`
 *   ou `/relevo/{z}/{x}/{y}.png`. Sem ela, vale a fonte padrão.
 * - `VITE_RELEVO_ZOOM_MAXIMO`: maior zoom gerado (8 a 15; padrão 13).
 * - `VITE_RELEVO_NOME`: nome da fonte, para a aba Sobre e o crédito no mapa.
 *
 * Configuração inválida não é usada pela metade: volta-se à fonte padrão, com
 * um aviso que a aba Sobre mostra.
 */
export function fonteDoRelevo(ambiente: Record<string, string | undefined>): FonteRelevo {
  const url = ambiente.VITE_RELEVO_URL?.trim();
  if (!url) return FONTE_PADRAO;

  const invalida = (motivo: string): FonteRelevo => ({
    ...FONTE_PADRAO,
    avisoConfiguracao: `${motivo} Usando a fonte padrão.`,
  });

  if (!/^(https:\/\/|\/)/.test(url)) return invalida('VITE_RELEVO_URL deve começar com "https://" ou "/".');
  if (!['{z}', '{x}', '{y}'].every((parte) => url.includes(parte))) {
    return invalida('VITE_RELEVO_URL deve conter {z}, {x} e {y}.');
  }

  const zoomInformado = ambiente.VITE_RELEVO_ZOOM_MAXIMO?.trim();
  const zoom = zoomInformado ? Number(zoomInformado) : ZOOM_PADRAO_TILES_PROPRIOS;
  if (!Number.isInteger(zoom) || zoom < 8 || zoom > 15) {
    return invalida('VITE_RELEVO_ZOOM_MAXIMO deve ser um número inteiro de 8 a 15.');
  }

  const nome = ambiente.VITE_RELEVO_NOME?.trim() || 'Modelo digital do terreno (tiles próprios)';
  return { urlTiles: url, nome, atribuicao: `Relevo: ${nome}`, tipo: 'terreno', zoomMaximoNativo: zoom };
}

const FONTE = fonteDoRelevo(import.meta.env as Record<string, string | undefined>);

export const RELEVO = {
  ...FONTE,
  tamanhoTile: 256,
  /** Zoom usado para consultar a altitude de um ponto: o mais detalhado da fonte. */
  zoomConsulta: FONTE.zoomMaximoNativo,
  /** Opacidade do mapa de calor sobre o mapa base. */
  opacidade: 0.6,
  /** Quantos tiles de altitude ficam guardados em memória. */
  tilesEmCache: 96,
};

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
