import { Icone } from '@/components/ui/Icone';
import { FAIXAS_INCLINACAO } from '@/config/inclinacao';

/** Legenda das classes de inclinação dos setores. */
export function LegendaInclinacao({ aoOcultar }: { aoOcultar?: () => void }) {
  return (
    <div className="legenda" role="group" aria-label="Legenda de inclinação">
      <div className="legenda__cabecalho">
        <p className="legenda__titulo">Relevo / Inclinação</p>
        {aoOcultar && (
          <button type="button" className="botao-ocultar" aria-label="Ocultar legenda" onClick={aoOcultar}>
            <Icone nome="menos" tamanho={14} />
          </button>
        )}
      </div>
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
