import { Icone } from '@/components/ui/Icone';
import { CLIMA } from '@/config/clima';
import type { EstadoClima } from '@/hooks/useClima';

interface Props {
  estado: EstadoClima;
  /** De onde é a previsão, ex.: "sua localização" ou "Recife". */
  local: string;
  /** A chuva mostrada é de teste (modo demonstração), não a previsão real. */
  simulado?: boolean;
}

const hora = (data: Date) => `${data.toLocaleTimeString('pt-BR', { hour: '2-digit' })}h`;
const milimetros = (mm: number) => mm.toLocaleString('pt-BR', { maximumFractionDigits: 1 });

export function PainelClima({ estado, local, simulado = false }: Props) {
  const clima = estado.status === 'ok' ? estado.clima : null;
  const semDados = estado.status === 'erro' ? 'Sem dados' : 'Carregando…';

  return (
    <section className="painel clima" aria-label="Previsão do tempo">
      <div className="clima__resumo">
        <Icone nome="chuva" tamanho={40} className="clima__icone" />
        <div className="clima__chuva">
          <p className="rotulo">Previsão de chuva (próximas {CLIMA.horasDePrevisao}h)</p>
          <p className="clima__valor">
            <strong>{clima && clima.probabilidadeChuva !== null ? `${Math.round(clima.probabilidadeChuva)}%` : '—'}</strong>
            <span className={`selo ${clima ? `selo--${clima.intensidade}` : 'selo--neutro'}`}>
              {clima ? clima.rotuloIntensidade : semDados}
            </span>
          </p>
        </div>
        <div className="clima__temp">
          <Icone nome="termometro" tamanho={30} className="clima__termometro" />
          <div>
            <p className="rotulo">Temp. atual</p>
            <p className="clima__valor">
              <strong>{clima && clima.temperatura !== null ? `${Math.round(clima.temperatura)}°C` : '—'}</strong>
            </p>
          </div>
        </div>
      </div>

      {clima && (
        <ul className="clima__horas" aria-label="Previsão hora a hora">
          {clima.horas.map((h) => (
            <li key={h.inicio.getTime()}>
              <span>{hora(h.inicio)}</span>
              <strong>{h.probabilidade !== null ? `${Math.round(h.probabilidade)}%` : '—'}</strong>
              <span>{milimetros(h.volumeMm)} mm</span>
            </li>
          ))}
        </ul>
      )}

      <p className="rotulo clima__local">
        {estado.status === 'erro'
          ? 'Não foi possível obter a previsão. Nova tentativa em instantes.'
          : `Previsão para ${local}${clima ? ` · ${milimetros(clima.volumeMm)} mm no período` : ''}`}
      </p>
      {simulado && (
        <p className="clima__simulado" role="status">
          Chuva simulada (modo demonstração)
        </p>
      )}
    </section>
  );
}
