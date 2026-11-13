import { ESCALA_ALTITUDE } from '@/config/relevo';

const GRADIENTE = `linear-gradient(90deg, ${ESCALA_ALTITUDE.map(
  (parada, i) => `rgb(${parada.cor.join(' ')}) ${(i / (ESCALA_ALTITUDE.length - 1)) * 100}%`,
).join(', ')})`;

/** Legenda do mapa de calor: claro = baixo, vermelho = alto. */
export function LegendaAltitude() {
  const ultima = ESCALA_ALTITUDE.length - 1;
  return (
    <div className="legenda" role="group" aria-label="Legenda de altitude">
      <p className="legenda__titulo">Altitude (m)</p>
      <div className="legenda__barra" style={{ background: GRADIENTE }} />
      <div className="legenda__valores">
        {ESCALA_ALTITUDE.map((parada, i) => (
          <span key={parada.altitude}>
            {parada.altitude}
            {i === ultima ? '+' : ''}
          </span>
        ))}
      </div>
    </div>
  );
}
