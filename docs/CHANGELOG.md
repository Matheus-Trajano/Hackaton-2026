# Histórico de mudanças

Uma entrada por prompt/etapa.

## 0.3.0 — Etapa 3: mapa base de Pernambuco

- Mapa Leaflet centrado em Pernambuco, travado na região do estado.
- Controles de aproximar, afastar e centralizar; escala métrica.
- Troca de camada: satélite (Esri World Imagery, padrão) ou ruas (OpenStreetMap).
- Aviso quando as imagens do mapa base não carregam.
- Aba Mapa passa a mostrar o mapa em tela cheia.
- Funções de limites geográficos em `src/domain/geografia.ts`.
- Dependências novas: `leaflet` e `@types/leaflet`.
- Verificação: lint, tipos, 24 testes e build aprovados; carregamento real dos
  tiles a conferir no preview.

## 0.2.0 — Etapa 2: layout mobile

- Moldura de celular para simular o dispositivo em telas largas, com barra de
  status e relógio real.
- Cabeçalho com logo, nome e botão de ajustes.
- Tela inicial conforme a imagem de referência: painel de clima, área do mapa,
  painel de risco, instruções, botão "Pedir socorro" e barra de monitoramento.
- Navegação inferior com quatro abas (Início, Mapa, Alertas, Sobre).
- Aba Sobre com modo demonstração do estado de risco.
- Painéis sem dados mostram "—"; botão de socorro desativado até a etapa 9.
- Conjunto de ícones SVG próprio; tema escuro em CSS puro.
- Tipos compartilhados em `src/types`.
- Verificação: lint, tipos, 8 testes e build aprovados; conferência visual
  pendente do usuário.

## 0.1.0 — Etapa 1: estrutura do projeto

- Projeto Vite + React + TypeScript criado (tipagem estrita, alias `@/`).
- ESLint, Vitest e Testing Library configurados.
- Script `npm run verificar` (lint + tipos + testes + build).
- Estrutura de pastas (`api`, `docs`, `public`, `src/*`, `tests`).
- Configuração central em `src/config/app.ts` (nome, setor de 100 m, limites de PE).
- Tela provisória e tema base de cores.
- `vercel.json` para deploy.
- Documentação inicial: README, PLANO, ARQUITETURA, APIS, DEPLOY, CHANGELOG.
- Verificação: lint, tipos, 3 testes e build aprovados.
