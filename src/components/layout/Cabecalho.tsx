import { APP } from '@/config/app';

export function Cabecalho() {
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
      <span className="cabecalho__espaco" aria-hidden="true" />
    </header>
  );
}
