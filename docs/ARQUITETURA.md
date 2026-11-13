# Arquitetura

Aplicação web de página única (SPA), mobile-first, sem backend próprio além de
uma função serverless para o alerta de socorro.

## Camadas

```
components  →  hooks  →  services (APIs externas)
                 ↓
              domain (lógica pura: grade, inclinação, risco)
```

- **components/**: só interface; não fazem chamadas de rede diretamente.
- **hooks/**: ligam interface, serviços e domínio (estado, carregamento, erro).
- **services/**: um arquivo por API externa; devolvem dados já tipados.
- **domain/**: funções puras, sem rede nem DOM — é onde ficam os cálculos e a
  maior parte dos testes.
- **config/**: constantes (`src/config/app.ts`).

## Fluxo de dados previsto

1. O navegador informa a posição do dispositivo (ou um ponto simulado).
2. A posição é convertida no setor de 100 m da grade.
3. As altitudes do setor e dos vizinhos dão a inclinação (%).
4. A previsão de chuva é buscada para a mesma posição.
5. O motor de risco combina inclinação e chuva e alimenta o painel inferior.

## Decisões

| Decisão | Motivo |
|---|---|
| Vite + React + TypeScript | Build rápido, deploy direto na Vercel, tipagem estrita |
| Web app em vez de app nativo | Roda na Vercel e simula o celular no navegador |
| Chamadas às APIs direto do navegador | APIs públicas, sem chave; dispensa backend |
| Lógica de cálculo isolada em `domain/` | Testável sem rede e sem mapa |
| Alias `@/` → `src/` | Imports curtos e estáveis |

## Estado atual (etapa 1)

Existe apenas a tela provisória (`src/App.tsx`) e a configuração central.
As pastas das demais camadas estão criadas e vazias.
