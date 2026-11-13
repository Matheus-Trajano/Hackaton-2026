import L from 'leaflet';
import { faixaDaClasse, GRADE } from '@/config/inclinacao';
import type { Coordenada } from '@/domain/geografia';
import { idDoSetor, limitesDoSetor, setoresNaArea, type Setor } from '@/domain/grade';
import { inclinacaoDoSetor, type Inclinacao } from '@/domain/inclinacao';
import { consultarAltitude } from '@/services/terreno';

function retangulo(setor: Setor, estilo: L.PathOptions): L.Rectangle {
  const l = limitesDoSetor(setor);
  return L.rectangle(
    [
      [l.sul, l.oeste],
      [l.norte, l.leste],
    ],
    { interactive: false, ...estilo },
  );
}

export interface OpcoesDesenho {
  /** Pinta cada setor com a cor da sua classe de inclinação. */
  preencher: boolean;
  /** Setor do usuário, desenhado com contorno reforçado. */
  destaque?: { setor: Setor; cor?: string };
}

/**
 * Desenha no mapa a grade de setores de 100 m da área visível e, se pedido,
 * pinta cada setor conforme a inclinação.
 */
export class CamadaSetores {
  private readonly grupo = L.layerGroup();
  private readonly resultados = new Map<string, Inclinacao>();
  private geracao = 0;

  constructor(
    private readonly mapa: L.Map,
    private readonly consultar: (ponto: Coordenada) => Promise<number> = consultarAltitude,
  ) {
    this.grupo.addTo(mapa);
  }

  /** Redesenha para a área visível. Devolve quantos setores foram desenhados (0 se o zoom for insuficiente). */
  desenhar({ preencher, destaque }: OpcoesDesenho): number {
    const geracao = ++this.geracao;
    this.grupo.clearLayers();

    if (destaque) {
      retangulo(destaque.setor, { color: destaque.cor ?? '#ffffff', weight: 3, fill: false, className: 'setor-usuario' }).addTo(
        this.grupo,
      );
    }
    if (this.mapa.getZoom() < GRADE.zoomMinimo) return 0;

    const b = this.mapa.getBounds();
    const setores = setoresNaArea(
      { sul: b.getSouth(), norte: b.getNorth(), oeste: b.getWest(), leste: b.getEast() },
      GRADE.maximoDeSetores,
    );
    if (!setores) return 0;

    for (const setor of setores) {
      const forma = retangulo(setor, { color: '#ffffff', weight: 0.6, opacity: 0.5, fill: false, className: 'setor' });
      forma.addTo(this.grupo);
      if (!preencher) continue;
      void this.inclinacao(setor).then(
        (inclinacao) => {
          // Ignora respostas de um desenho antigo.
          if (geracao !== this.geracao) return;
          forma.setStyle({ fill: true, fillColor: faixaDaClasse(inclinacao.classe).cor, fillOpacity: 0.45 });
        },
        () => {
          // Sem dados de relevo, o setor fica só com o contorno.
        },
      );
    }
    return setores.length;
  }

  remover(): void {
    this.geracao++;
    this.grupo.remove();
  }

  private async inclinacao(setor: Setor): Promise<Inclinacao> {
    const id = idDoSetor(setor);
    const guardada = this.resultados.get(id);
    if (guardada) return guardada;
    const calculada = await inclinacaoDoSetor(setor, this.consultar);
    if (this.resultados.size >= GRADE.setoresEmCache) this.resultados.clear();
    this.resultados.set(id, calculada);
    return calculada;
  }
}
