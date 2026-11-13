import { APP, ETAPA_ATUAL, TOTAL_ETAPAS } from '@/config/app';

/** Tela provisória da etapa 1: confirma que a base do projeto está de pé. */
export function App() {
  return (
    <main className="inicio">
      <h1>{APP.nome}</h1>
      <p className="slogan">{APP.slogan}</p>
      <p className="estado">
        Estrutura do projeto pronta — etapa {ETAPA_ATUAL} de {TOTAL_ETAPAS}.
      </p>
      <p className="versao">v{APP.versao}</p>
    </main>
  );
}
