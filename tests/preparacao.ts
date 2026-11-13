import { beforeEach, vi } from 'vitest';

// Nenhum teste acessa a rede: por padrão, toda chamada a `fetch` falha.
// Os testes que precisam de uma resposta fornecem a sua própria.
beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.reject(new Error('Rede bloqueada nos testes.'))),
  );
});
