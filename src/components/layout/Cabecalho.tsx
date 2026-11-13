import { Icone } from '@/components/ui/Icone';
import { APP } from '@/config/app';

interface Props {
  aoAbrirAjustes: () => void;
}

export function Cabecalho({ aoAbrirAjustes }: Props) {
  return (
    <header className="cabecalho">
      <span className="cabecalho__espaco" />
      <div className="cabecalho__marca">
        <svg className="cabecalho__logo" width="38" height="42" viewBox="0 0 38 42" aria-hidden="true">
          <path d="M19 1 36 7v13c0 10.5-7.2 17.8-17 21C9.2 37.8 2 30.5 2 20V7L19 1Z" fill="#ff7a1a" />
          <path d="M8 29 16 15l5 7 3-4 6 11H8Z" fill="#fff" />
        </svg>
        <div>
          <h1 className="cabecalho__nome">{APP.nome}</h1>
          <p className="cabecalho__slogan">{APP.slogan}</p>
        </div>
      </div>
      <button type="button" className="botao-icone" onClick={aoAbrirAjustes} aria-label="Ajustes">
        <Icone nome="engrenagem" tamanho={22} />
      </button>
    </header>
  );
}
