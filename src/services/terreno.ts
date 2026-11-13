import { RELEVO } from '@/config/relevo';
import { decodificarTerrarium, posicaoNoTile } from '@/domain/altitude';
import type { Coordenada } from '@/domain/geografia';

/** Carrega as altitudes (m) de um tile, linha a linha, `tamanhoTile²` valores. */
export type CarregadorTile = (z: number, x: number, y: number) => Promise<Float32Array>;

export function urlDoTile(z: number, x: number, y: number): string {
  return RELEVO.urlTiles.replace('{z}', String(z)).replace('{x}', String(x)).replace('{y}', String(y));
}

/** Baixa um tile Terrarium e decodifica as altitudes. Só funciona no navegador. */
export const carregarTileTerrarium: CarregadorTile = (z, x, y) =>
  new Promise((resolver, rejeitar) => {
    const imagem = new Image();
    // Necessário para ler os pixels de uma imagem de outro domínio.
    imagem.crossOrigin = 'anonymous';
    imagem.onload = () => {
      try {
        const tela = document.createElement('canvas');
        tela.width = RELEVO.tamanhoTile;
        tela.height = RELEVO.tamanhoTile;
        const contexto = tela.getContext('2d', { willReadFrequently: true });
        if (!contexto) throw new Error('Canvas indisponível neste navegador.');
        contexto.drawImage(imagem, 0, 0, RELEVO.tamanhoTile, RELEVO.tamanhoTile);
        const { data } = contexto.getImageData(0, 0, RELEVO.tamanhoTile, RELEVO.tamanhoTile);
        resolver(decodificarTerrarium(data));
      } catch (erro) {
        rejeitar(erro instanceof Error ? erro : new Error(String(erro)));
      }
    };
    imagem.onerror = () => rejeitar(new Error(`Falha ao carregar o tile de relevo ${z}/${x}/${y}.`));
    imagem.src = urlDoTile(z, x, y);
  });

/**
 * Guarda em memória os tiles já carregados (e os pedidos em andamento), para o
 * mapa de calor e as consultas de altitude não baixarem o mesmo tile duas vezes.
 * Ao passar de `maximo`, descarta o tile usado há mais tempo. Falhas não ficam guardadas.
 */
export function criarCacheDeTiles(carregar: CarregadorTile, maximo: number = RELEVO.tilesEmCache): CarregadorTile {
  const cache = new Map<string, Promise<Float32Array>>();
  return (z, x, y) => {
    const chave = `${z}/${x}/${y}`;
    const existente = cache.get(chave);
    if (existente) {
      // Reinsere para marcar como usado recentemente.
      cache.delete(chave);
      cache.set(chave, existente);
      return existente;
    }
    const pedido = carregar(z, x, y);
    cache.set(chave, pedido);
    pedido.catch(() => {
      if (cache.get(chave) === pedido) cache.delete(chave);
    });
    if (cache.size > maximo) {
      const maisAntiga = cache.keys().next().value;
      if (maisAntiga !== undefined) cache.delete(maisAntiga);
    }
    return pedido;
  };
}

/** Carregador compartilhado por todo o app. */
export const tilesDeAltitude: CarregadorTile = criarCacheDeTiles(carregarTileTerrarium);

/** Altitude (m) de um ponto, lida do tile que o contém. */
export async function consultarAltitude(
  ponto: Coordenada,
  carregar: CarregadorTile = tilesDeAltitude,
  zoom: number = RELEVO.zoomConsulta,
): Promise<number> {
  const { x, y, px, py } = posicaoNoTile(ponto, zoom, RELEVO.tamanhoTile);
  const altitudes = await carregar(zoom, x, y);
  const altitude = altitudes[py * RELEVO.tamanhoTile + px];
  if (altitude === undefined || Number.isNaN(altitude)) throw new Error('Tile de relevo incompleto.');
  return altitude;
}
