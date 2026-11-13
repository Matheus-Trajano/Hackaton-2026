import { APP, ETAPA_ATUAL, TOTAL_ETAPAS } from '@/config/app';
import type { EstadoRisco } from '@/types';

const OPCOES: { valor: EstadoRisco; rotulo: string }[] = [
  { valor: 'indefinido', rotulo: 'Não avaliado' },
  { valor: 'seguro', rotulo: 'Área segura' },
  { valor: 'risco', rotulo: 'Em risco' },
];

interface Props {
  estadoRisco: EstadoRisco;
  aoMudarEstadoRisco: (estado: EstadoRisco) => void;
}

export function TelaSobre({ estadoRisco, aoMudarEstadoRisco }: Props) {
  return (
    <div className="sobre">
      <section className="painel">
        <h2>{APP.nome}</h2>
        <p>
          Protótipo que avisa quando você está em uma encosta com risco de deslizamento, cruzando sua
          localização, a inclinação do terreno e a previsão de chuva. Cobertura inicial: Pernambuco.
        </p>
        <p className="rotulo">
          Versão {APP.versao} · etapa {ETAPA_ATUAL} de {TOTAL_ETAPAS}
        </p>
      </section>

      <section className="painel">
        <h2>Modo demonstração</h2>
        <p>
          A análise de risco real ainda não está ligada. Escolha um estado para ver como a tela inicial
          se comporta.
        </p>
        <div className="segmentado" role="group" aria-label="Estado de risco simulado">
          {OPCOES.map((opcao) => (
            <button
              key={opcao.valor}
              type="button"
              aria-pressed={estadoRisco === opcao.valor}
              onClick={() => aoMudarEstadoRisco(opcao.valor)}
            >
              {opcao.rotulo}
            </button>
          ))}
        </div>
      </section>

      <section className="painel sobre__aviso">
        <h2>Aviso</h2>
        <p>
          Este aplicativo é um protótipo e não substitui o mapeamento oficial da Defesa Civil. Em
          emergência, ligue {APP.telefoneEmergencia}.
        </p>
      </section>
    </div>
  );
}
