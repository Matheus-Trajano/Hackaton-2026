import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef, useState } from 'react';
import { Icone } from '@/components/ui/Icone';
import { LIMITES_PE } from '@/config/app';
import { MAPA, MAPAS_BASE, type IdMapaBase } from '@/config/mapa';
import { expandirLimites } from '@/domain/geografia';
import {
  formatarCoordenada,
  mensagemLocalizacao,
  posicaoUtilizavel,
  type EstadoLocalizacao,
} from '@/domain/localizacao';

const AREA_PERMITIDA = expandirLimites(LIMITES_PE, MAPA.folgaGraus);

function criarCamada(id: IdMapaBase): L.TileLayer {
  const base = MAPAS_BASE[id];
  return L.tileLayer(base.url, {
    attribution: base.atribuicao,
    maxNativeZoom: base.zoomMaximoNativo,
    maxZoom: MAPA.zoomMaximo,
  });
}

const ICONE_USUARIO = L.divIcon({
  className: 'marcador-usuario',
  html:
    '<svg width="34" height="44" viewBox="0 0 34 44" aria-hidden="true">' +
    '<path d="M17 43S2 28.5 2 17a15 15 0 1 1 30 0c0 11.5-15 26-15 26Z" fill="#e5262b" stroke="#fff" stroke-width="2.5"/>' +
    '<circle cx="17" cy="17" r="6" fill="#fff"/></svg><span class="marcador-usuario__ponto"></span>',
  iconSize: [34, 50],
  iconAnchor: [17, 46],
});

interface Props {
  className?: string;
  /** Sem localização, o mapa mostra só Pernambuco. */
  localizacao?: EstadoLocalizacao;
  /** Ação do botão oferecido quando a localização real não está disponível. */
  aoUsarDemonstracao?: () => void;
}

/**
 * Mapa base (Leaflet) centrado em Pernambuco e limitado ao estado, com
 * controles próprios de zoom, centralizar e troca de camada, e escala métrica.
 * Quando há localização utilizável, mostra o marcador do usuário e foca nele.
 */
export function MapaBase({ className = '', localizacao, aoUsarDemonstracao }: Props) {
  const elemento = useRef<HTMLDivElement>(null);
  const mapa = useRef<L.Map | null>(null);
  const camada = useRef<L.TileLayer | null>(null);
  const marcador = useRef<{ pino: L.Marker; precisao: L.Circle } | null>(null);
  const focoAnterior = useRef<string | null>(null);
  const [base, setBase] = useState<IdMapaBase>(MAPA.baseInicial);
  const [zoom, setZoom] = useState<number>(MAPA.zoomInicial);
  const [falhaNosTiles, setFalhaNosTiles] = useState(false);

  // Cria o mapa uma única vez.
  useEffect(() => {
    const el = elemento.current;
    if (!el) return;

    const m = L.map(el, {
      center: [MAPA.centro.lat, MAPA.centro.lon],
      zoom: MAPA.zoomInicial,
      minZoom: MAPA.zoomMinimo,
      maxZoom: MAPA.zoomMaximo,
      maxBounds: [
        [AREA_PERMITIDA.sul, AREA_PERMITIDA.oeste],
        [AREA_PERMITIDA.norte, AREA_PERMITIDA.leste],
      ],
      maxBoundsViscosity: 1,
      zoomControl: false,
    });
    m.attributionControl.setPrefix(false);
    L.control.scale({ position: 'bottomright', metric: true, imperial: false, maxWidth: 110 }).addTo(m);
    m.on('zoomend', () => setZoom(m.getZoom()));
    mapa.current = m;

    // Recalcula o tamanho quando o painel muda (troca de aba, rotação, etc.).
    const observador =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => m.invalidateSize());
    observador?.observe(el);

    return () => {
      observador?.disconnect();
      m.remove();
      mapa.current = null;
      camada.current = null;
      // O marcador pertence ao mapa removido; será recriado no próximo mapa.
      marcador.current = null;
      focoAnterior.current = null;
    };
  }, []);

  // Aplica (ou troca) a camada do mapa base.
  useEffect(() => {
    const m = mapa.current;
    if (!m) return;
    const nova = criarCamada(base);
    let carregouAlgum = false;
    nova.on('tileload', () => {
      carregouAlgum = true;
      setFalhaNosTiles(false);
    });
    nova.on('tileerror', () => {
      if (!carregouAlgum) setFalhaNosTiles(true);
    });
    nova.addTo(m);
    camada.current = nova;
    return () => {
      nova.remove();
    };
  }, [base]);

  // Marcador do usuário: cria, move ou remove conforme a localização.
  const posicao = localizacao && posicaoUtilizavel(localizacao) ? localizacao.posicao : null;
  const lat = posicao?.lat;
  const lon = posicao?.lon;
  const precisaoMetros = localizacao?.precisaoMetros ?? 0;
  // Muda quando a origem da posição muda (GPS ↔ outro ponto de demonstração).
  const chaveFoco = localizacao ? `${localizacao.modo}:${localizacao.nomeLocal ?? ''}` : null;

  useEffect(() => {
    const m = mapa.current;
    if (!m) return;
    if (lat === undefined || lon === undefined) {
      marcador.current?.pino.remove();
      marcador.current?.precisao.remove();
      marcador.current = null;
      focoAnterior.current = null;
      return;
    }
    const ponto: L.LatLngTuple = [lat, lon];
    if (marcador.current) {
      marcador.current.pino.setLatLng(ponto);
      marcador.current.precisao.setLatLng(ponto).setRadius(precisaoMetros);
    } else {
      marcador.current = {
        precisao: L.circle(ponto, {
          radius: precisaoMetros,
          color: '#1f5eff',
          weight: 1,
          fillOpacity: 0.15,
          interactive: false,
        }).addTo(m),
        pino: L.marker(ponto, { icon: ICONE_USUARIO, interactive: false, keyboard: false }).addTo(m),
      };
    }
    // Foca no usuário na primeira posição e quando a origem muda; depois, só move o marcador.
    if (focoAnterior.current !== chaveFoco) {
      focoAnterior.current = chaveFoco;
      m.setView(ponto, MAPA.zoomUsuario);
    }
  }, [lat, lon, precisaoMetros, chaveFoco]);

  const centralizar = () => {
    if (posicao) mapa.current?.setView([posicao.lat, posicao.lon], MAPA.zoomUsuario);
    else mapa.current?.setView([MAPA.centro.lat, MAPA.centro.lon], MAPA.zoomInicial);
  };
  const avisoLocalizacao = localizacao ? mensagemLocalizacao(localizacao) : null;
  const podeOferecerDemo =
    Boolean(aoUsarDemonstracao) && localizacao !== undefined && localizacao.status !== 'buscando';
  const outraBase: IdMapaBase = base === 'satelite' ? 'ruas' : 'satelite';

  return (
    <section className={`mapa ${className}`} aria-label="Mapa">
      <div ref={elemento} className="mapa__leaflet" data-zoom={zoom} data-base={base} />

      <div className="mapa__avisos">
        {falhaNosTiles && (
          <p className="mapa__aviso" role="status">
            Não foi possível carregar o mapa base. Verifique a conexão ou troque a camada.
          </p>
        )}
        {avisoLocalizacao && (
          <div className="mapa__aviso" role="status">
            <p>{avisoLocalizacao}</p>
            {podeOferecerDemo && (
              <button type="button" onClick={aoUsarDemonstracao}>
                Usar local de demonstração
              </button>
            )}
          </div>
        )}
      </div>

      {posicao && localizacao && (
        <div className="mapa__coordenadas">
          <Icone nome="mira" tamanho={22} />
          <div>
            <p className="rotulo">
              {localizacao.modo === 'simulado' ? 'Localização simulada' : 'Sua localização'}
            </p>
            <p>{formatarCoordenada(posicao)}</p>
            {localizacao.modo === 'gps' && localizacao.precisaoMetros !== undefined && (
              <p className="rotulo">Precisão: ±{Math.round(localizacao.precisaoMetros)} m</p>
            )}
          </div>
        </div>
      )}

      <div className="mapa__controles">
        <button
          type="button"
          aria-label="Aproximar"
          disabled={zoom >= MAPA.zoomMaximo}
          onClick={() => mapa.current?.zoomIn()}
        >
          <Icone nome="mais" tamanho={22} />
        </button>
        <button
          type="button"
          aria-label="Afastar"
          disabled={zoom <= MAPA.zoomMinimo}
          onClick={() => mapa.current?.zoomOut()}
        >
          <Icone nome="menos" tamanho={22} />
        </button>
        <button
          type="button"
          aria-label={posicao ? 'Centralizar na minha localização' : 'Centralizar em Pernambuco'}
          onClick={centralizar}
        >
          <Icone nome="mira" tamanho={22} />
        </button>
        <button
          type="button"
          aria-label={`Trocar mapa base para ${MAPAS_BASE[outraBase].rotulo}`}
          onClick={() => {
            setFalhaNosTiles(false);
            setBase(outraBase);
          }}
        >
          <Icone nome="camadas" tamanho={22} />
        </button>
      </div>
    </section>
  );
}
