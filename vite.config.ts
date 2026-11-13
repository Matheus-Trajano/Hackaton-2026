import type { IncomingMessage, ServerResponse } from 'node:http';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import { processarAlerta } from './api/alerta.ts';

/**
 * Na Vercel, `/api/alerta` é uma função serverless. No servidor de
 * desenvolvimento e no `vite preview` ela não existe; este plugin atende a rota
 * com a mesma lógica, para o botão de socorro funcionar localmente.
 */
function apiLocal(): Plugin {
  const atender = (pedido: IncomingMessage, resposta: ServerResponse, proximo: () => void) => {
    if (!pedido.url || new URL(pedido.url, 'http://local').pathname !== '/api/alerta') return proximo();
    let corpo = '';
    pedido.on('data', (parte: Buffer) => (corpo += parte.toString()));
    pedido.on('end', () => {
      const resultado = processarAlerta(pedido.method ?? 'GET', corpo);
      resposta.statusCode = resultado.status;
      resposta.setHeader('Content-Type', 'application/json; charset=utf-8');
      resposta.end(JSON.stringify(resultado.corpo));
    });
  };
  return {
    name: 'api-local',
    configureServer: (servidor) => void servidor.middlewares.use(atender),
    configurePreviewServer: (servidor) => void servidor.middlewares.use(atender),
  };
}

export default defineConfig({
  plugins: [react(), apiLocal()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { host: '0.0.0.0', port: 5173, allowedHosts: true },
  preview: { host: '0.0.0.0', port: 4173, allowedHosts: true },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.{ts,tsx}'],
    setupFiles: ['tests/preparacao.ts'],
  },
});
