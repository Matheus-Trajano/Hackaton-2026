/**
 * Registra o service worker (public/sw.js), que permite instalar o app e abrir
 * a interface sem internet. Só em produção: no servidor de desenvolvimento ele
 * atrapalharia a atualização dos arquivos.
 *
 * Devolve `true` se o registro foi feito.
 */
export async function registrarServiceWorker(
  producao: boolean,
  servico: Pick<ServiceWorkerContainer, 'register'> | undefined = navigator.serviceWorker,
): Promise<boolean> {
  if (!producao || !servico) return false;
  try {
    await servico.register('/sw.js');
    return true;
  } catch (erro) {
    // O app funciona normalmente sem ele; só não fica instalável nem abre offline.
    console.warn('Service worker não registrado:', erro);
    return false;
  }
}
