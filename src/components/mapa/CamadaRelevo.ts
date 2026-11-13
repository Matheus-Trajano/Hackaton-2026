import L from 'leaflet';
import { RELEVO } from '@/config/relevo';
import { colorirAltitudes } from '@/domain/altitude';
import { tilesDeAltitude, type CarregadorTile } from '@/services/terreno';

/**
 * Camada do Leaflet que pinta o mapa de calor de altitude: para cada tile, lê as
 * altitudes e desenha as cores em um canvas.
 */
export class CamadaRelevo extends L.GridLayer {
  private readonly carregar: CarregadorTile;

  constructor(opcoes: L.GridLayerOptions = {}, carregar: CarregadorTile = tilesDeAltitude) {
    super({
      attribution: RELEVO.atribuicao,
      tileSize: RELEVO.tamanhoTile,
      maxNativeZoom: RELEVO.zoomMaximoNativo,
      opacity: RELEVO.opacidade,
      ...opcoes,
    });
    this.carregar = carregar;
  }

  protected createTile(coords: L.Coords, concluir: L.DoneCallback): HTMLElement {
    const tela = document.createElement('canvas');
    tela.width = RELEVO.tamanhoTile;
    tela.height = RELEVO.tamanhoTile;
    this.carregar(coords.z, coords.x, coords.y).then(
      (altitudes) => {
        const contexto = tela.getContext('2d');
        if (!contexto) {
          concluir(new Error('Canvas indisponível neste navegador.'), tela);
          return;
        }
        const pixels = colorirAltitudes(altitudes);
        contexto.putImageData(new ImageData(pixels, RELEVO.tamanhoTile, RELEVO.tamanhoTile), 0, 0);
        concluir(undefined, tela);
      },
      (erro: unknown) => concluir(erro instanceof Error ? erro : new Error(String(erro)), tela),
    );
    return tela;
  }
}
