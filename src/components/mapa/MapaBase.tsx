import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef, useState } from 'react';
import { Icone } from '@/components/ui/Icone';
import { LIMITES_PE } from '@/config/app';
import { MAPA, MAPAS_BASE, type IdMapaBase } from '@/config/mapa';
import { expandirLimites } from '@/domain/geografia';

const AREA_PERMITIDA = expandirLimites(LIMITES_PE, MAPA.folgaGraus);

function criarCamada(id: IdMapaBase): L.TileLayer {
  const base = MAPAS_BASE[id];
  return L.tileLayer(base.url, {
    attribution: base.atribuicao,
    maxNativeZoom: base.zoomMaximoNativo,
    maxZoom: MAPA.zoomMaximo,
  });
}

/**
 * Mapa base (Leaflet) centrado em Pernambuco e limitado ao estado, com
 * controles próprios de zoom, centralizar e troca de camada, e escala métrica.
 */
export function MapaBase({ className = '' }: { className?: string }) {
  const elemento = useRef<HTMLDivElement>(null);
  const mapa = useRef<L.Map | null>(null);
  const camada = useRef<L.TileLayer | null>(null);
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

  const centralizar = () =>
    mapa.current?.setView([MAPA.centro.lat, MAPA.centro.lon], MAPA.zoomInicial);
  const outraBase: IdMapaBase = base === 'satelite' ? 'ruas' : 'satelite';

  return (
    <section className={`mapa ${className}`} aria-label="Mapa">
      <div ref={elemento} className="mapa__leaflet" data-zoom={zoom} data-base={base} />

      {falhaNosTiles && (
        <p className="mapa__aviso" role="status">
          Não foi possível carregar o mapa base. Verifique a conexão ou troque a camada.
        </p>
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
        <button type="button" aria-label="Centralizar em Pernambuco" onClick={centralizar}>
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
