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
        <img className="cabecalho__logo" src="/logo.png" width="44" height="44" alt="" />
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
