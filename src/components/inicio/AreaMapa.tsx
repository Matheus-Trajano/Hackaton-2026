import { Icone } from '@/components/ui/Icone';

/** Espaço reservado para o mapa (etapa 3). */
export function AreaMapa() {
  return (
    <section className="mapa" aria-label="Mapa">
      <div className="mapa__vazio">
        <Icone nome="pino" tamanho={34} />
        <p>O mapa de relevo aparecerá aqui.</p>
      </div>
    </section>
  );
}
