import { APP, ETAPA_ATUAL, TOTAL_ETAPAS } from '@/config/app';
import { PONTOS_DEMO } from '@/config/pontosDemo';
import { formatarCoordenada, mensagemLocalizacao, posicaoUtilizavel } from '@/domain/localizacao';
import type { Localizacao } from '@/hooks/useLocalizacao';
import type { EstadoRisco } from '@/types';

/** `automatico` usa os dados reais; os demais forçam um estado para demonstração. */
export type ModoRisco = 'automatico' | EstadoRisco;

const OPCOES: { valor: ModoRisco; rotulo: string }[] = [
  { valor: 'automatico', rotulo: 'Automático' },
  { valor: 'seguro', rotulo: 'Área segura' },
  { valor: 'atencao', rotulo: 'Atenção' },
  { valor: 'risco', rotulo: 'Em risco' },
];

interface Props {
  modoRisco: ModoRisco;
  aoMudarModoRisco: (modo: ModoRisco) => void;
  localizacao: Localizacao;
}

export function TelaSobre({ modoRisco, aoMudarModoRisco, localizacao }: Props) {
  const { estado, pontoDemoId, usarGps, usarPontoDemo } = localizacao;
  const aviso = mensagemLocalizacao(estado);
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
        <h2>Localização</h2>
        <p role="status">
          {posicaoUtilizavel(estado)
            ? `${estado.modo === 'simulado' ? `Simulada: ${estado.nomeLocal}` : 'GPS do aparelho'} (${formatarCoordenada(estado.posicao)})`
            : aviso}
        </p>
        <div className="lista-opcoes" role="group" aria-label="Origem da localização">
          <button type="button" aria-pressed={estado.modo === 'gps'} onClick={usarGps}>
            <strong>GPS do aparelho</strong>
            <small>Usa a posição real deste dispositivo</small>
          </button>
          {PONTOS_DEMO.map((ponto) => (
            <button
              key={ponto.id}
              type="button"
              aria-pressed={pontoDemoId === ponto.id}
              onClick={() => usarPontoDemo(ponto.id)}
            >
              <strong>{ponto.nome}</strong>
              <small>{ponto.descricao} · coordenada aproximada</small>
            </button>
          ))}
        </div>
      </section>

      <section className="painel">
        <h2>Modo demonstração</h2>
        <p>
          Em "Automático", o painel de risco usa os dados reais: a inclinação do seu setor e a previsão de
          chuva. As outras opções forçam um estado, para demonstração.
        </p>
        <div className="segmentado" role="group" aria-label="Estado de risco simulado">
          {OPCOES.map((opcao) => (
            <button
              key={opcao.valor}
              type="button"
              aria-pressed={modoRisco === opcao.valor}
              onClick={() => aoMudarModoRisco(opcao.valor)}
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
