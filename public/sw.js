/*
 * Service worker do Encosta Segura.
 *
 * Guarda a interface do app (página, scripts, estilos, ícones) para ele abrir
 * sem internet. NÃO guarda dados: mapa, relevo, previsão do tempo e o envio de
 * alertas dependem de conexão e passam direto, sem interferência.
 *
 * - Página: rede primeiro; sem rede, usa a última versão guardada.
 * - /assets/ (nomes com hash, nunca mudam): guardado primeiro.
 * - Demais arquivos do app: rede primeiro, guardado como reserva.
 */
const CACHE = 'encosta-segura-v1';
const INICIO = '/';
/** Dados, não interface: a API e os tiles de relevo (quando hospedados junto do app). */
const NAO_GUARDAR = ['/api/', '/relevo/'];

const ehHtml = (resposta) => (resposta.headers.get('content-type') ?? '').includes('text/html');

/** Baixa a página e os arquivos que ela cita, para o app abrir offline já na primeira vez. */
async function guardarInterface() {
  const cache = await caches.open(CACHE);
  const pagina = await fetch(INICIO, { cache: 'no-store' });
  if (!pagina.ok) throw new Error(`Página inicial respondeu ${pagina.status}.`);
  const html = await pagina.clone().text();
  await cache.put(INICIO, pagina);

  const citados = [...html.matchAll(/(?:src|href)="(\/(?!\/)[^"]+)"/g)].map((achado) => achado[1]);
  await Promise.all(
    [...new Set(citados)].map(async (caminho) => {
      try {
        const resposta = await fetch(caminho);
        if (resposta.ok) await cache.put(caminho, resposta);
      } catch {
        // Um arquivo a menos não impede a instalação; ele é guardado no próximo uso.
      }
    }),
  );
}

async function pagina(pedido) {
  const cache = await caches.open(CACHE);
  try {
    const resposta = await fetch(pedido);
    if (resposta.ok && ehHtml(resposta)) await cache.put(INICIO, resposta.clone());
    return resposta;
  } catch (erro) {
    const guardada = await cache.match(INICIO);
    if (guardada) return guardada;
    throw erro;
  }
}

async function arquivo(pedido, caminho) {
  const cache = await caches.open(CACHE);
  const imutavel = caminho.startsWith('/assets/');
  if (imutavel) {
    const guardado = await cache.match(caminho);
    if (guardado) return guardado;
  }
  try {
    const resposta = await fetch(pedido);
    // Não guarda a página devolvida no lugar de um arquivo que não existe.
    if (resposta.ok && !ehHtml(resposta)) await cache.put(caminho, resposta.clone());
    return resposta;
  } catch (erro) {
    const guardado = await cache.match(caminho);
    if (guardado) return guardado;
    throw erro;
  }
}

self.addEventListener('install', (evento) => {
  evento.waitUntil(guardarInterface().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((nomes) =>
        Promise.all(
          nomes.filter((nome) => nome.startsWith('encosta-segura-') && nome !== CACHE).map((nome) => caches.delete(nome)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (evento) => {
  const pedido = evento.request;
  if (pedido.method !== 'GET') return;
  const url = new URL(pedido.url);
  // Outros servidores (mapas, relevo, clima), a API e os tiles de relevo não passam pelo cache.
  if (url.origin !== self.location.origin || NAO_GUARDAR.some((inicio) => url.pathname.startsWith(inicio))) return;
  evento.respondWith(pedido.mode === 'navigate' ? pagina(pedido) : arquivo(pedido, url.pathname + url.search));
});
