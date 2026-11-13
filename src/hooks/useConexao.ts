import { useSyncExternalStore } from 'react';

function assinar(aoMudar: () => void) {
  window.addEventListener('online', aoMudar);
  window.addEventListener('offline', aoMudar);
  return () => {
    window.removeEventListener('online', aoMudar);
    window.removeEventListener('offline', aoMudar);
  };
}

/**
 * `false` quando o aparelho informa que está sem rede.
 * `true` não garante internet funcionando (pode haver Wi-Fi sem acesso); as
 * falhas de cada serviço continuam sendo tratadas onde acontecem.
 */
export function useConexao(): boolean {
  return useSyncExternalStore(assinar, () => navigator.onLine, () => true);
}
