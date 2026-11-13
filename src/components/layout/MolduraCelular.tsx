import type { ReactNode } from 'react';
import { formatarHora, useRelogio } from '@/hooks/useRelogio';

/**
 * Em telas largas, desenha um celular em volta do app para simular o
 * dispositivo. Em celulares reais, a moldura some (ver CSS) e o app ocupa a
 * tela inteira.
 */
export function MolduraCelular({ children }: { children: ReactNode }) {
  const agora = useRelogio();
  return (
    <div className="palco">
      <div className="celular">
        <div className="barra-status" aria-hidden="true">
          <span className="barra-status__hora">{formatarHora(agora)}</span>
          <span className="barra-status__ilha" />
          <span className="barra-status__icones">
            <svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor">
              <rect x="0" y="8" width="3" height="4" rx="1" />
              <rect x="5" y="5.5" width="3" height="6.5" rx="1" />
              <rect x="10" y="3" width="3" height="9" rx="1" />
              <rect x="15" y="0" width="3" height="12" rx="1" />
            </svg>
            <svg width="26" height="12" viewBox="0 0 26 12" fill="none" stroke="currentColor">
              <rect x="0.5" y="0.5" width="22" height="11" rx="3" />
              <rect x="2.5" y="2.5" width="15" height="7" rx="1.5" fill="currentColor" stroke="none" />
              <path d="M24.5 4v4" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </span>
        </div>
        <div className="tela">{children}</div>
      </div>
    </div>
  );
}
