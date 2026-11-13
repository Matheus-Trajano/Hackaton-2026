import { FAIXAS_INCLINACAO } from '@/config/inclinacao';

/** Legenda das classes de inclinação dos setores. */
export function LegendaInclinacao() {
  return (
    <div className="legenda" role="group" aria-label="Legenda de inclinação">
      <p className="legenda__titulo">Relevo / Inclinação</p>
      <ul className="legenda__faixas">
        {FAIXAS_INCLINACAO.map((faixa) => (
          <li key={faixa.classe}>
            <span className="legenda__cor" style={{ background: faixa.cor }} />
            {faixa.rotulo} ({faixa.faixa})
          </li>
        ))}
      </ul>
    </div>
  );
}
