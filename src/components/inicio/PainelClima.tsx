import { Icone } from '@/components/ui/Icone';
import type { ResumoClima } from '@/types';

interface Props {
  /** Sem dados, o painel mostra traços. A integração chega na etapa 7. */
  clima?: ResumoClima;
}

export function PainelClima({ clima }: Props) {
  return (
    <section className="painel clima" aria-label="Previsão do tempo">
      <Icone nome="chuva" tamanho={40} className="clima__icone" />
      <div className="clima__chuva">
        <p className="rotulo">Previsão de chuva (próximas 3h)</p>
        <p className="clima__valor">
          <strong>{clima ? `${Math.round(clima.probabilidadeChuva)}%` : '—'}</strong>
          <span className={`selo${clima ? '' : ' selo--neutro'}`}>
            {clima ? clima.intensidade : 'Sem dados'}
          </span>
        </p>
      </div>
      <div className="clima__temp">
        <Icone nome="termometro" tamanho={30} className="clima__termometro" />
        <div>
          <p className="rotulo">Temp. atual</p>
          <p className="clima__valor">
            <strong>{clima ? `${Math.round(clima.temperatura)}°C` : '—'}</strong>
          </p>
        </div>
      </div>
    </section>
  );
}
