import { Icone } from '@/components/ui/Icone';
import { APP } from '@/config/app';
import { formatarCoordenada } from '@/domain/localizacao';
import type { RegistroDeAlerta } from '@/hooks/useAlertas';

interface Props {
  registros: RegistroDeAlerta[];
  aoLimpar: () => void;
}

const dataHora = (iso: string) => new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

/** Histórico dos pedidos de socorro feitos neste aparelho. */
export function TelaAlertas({ registros, aoLimpar }: Props) {
  return (
    <div className="alertas">
      <section className="painel alertas__topo">
        <h2>Alertas</h2>
        <p>
          Pedidos de socorro feitos neste aparelho. Neste protótipo eles são registros de demonstração e não
          chegam à Defesa Civil.
        </p>
        <a className="dialogo__ligar" href={`tel:${APP.telefoneEmergencia}`}>
          <Icone nome="telefone" tamanho={20} />
          Ligar {APP.telefoneEmergencia} (Defesa Civil)
        </a>
      </section>

      {registros.length === 0 ? (
        <p className="alertas__vazio">Nenhum pedido de socorro feito até agora.</p>
      ) : (
        <>
          <ul className="alertas__lista" aria-label="Histórico de alertas">
            {registros.map((r) => (
              <li key={r.id} className={`painel alerta alerta--${r.status}`}>
                <p className="alerta__linha">
                  <strong>{r.status === 'enviado' ? 'Alerta registrado' : 'Envio não concluído'}</strong>
                  <span className="rotulo">{dataHora(r.momento)}</span>
                </p>
                <p>{r.situacao}</p>
                <p className="rotulo">
                  {formatarCoordenada(r.posicao)}
                  {r.localizacaoSimulada ? ' (localização simulada)' : ''}
                  {r.protocolo ? ` · Protocolo ${r.protocolo}` : ''}
                </p>
              </li>
            ))}
          </ul>
          <button type="button" className="dialogo__secundario" onClick={aoLimpar}>
            Limpar histórico
          </button>
        </>
      )}
    </div>
  );
}
