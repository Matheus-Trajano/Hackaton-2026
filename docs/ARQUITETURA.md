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

## Interface

```
MolduraCelular            moldura do aparelho (só em telas largas) + barra de status
├── Cabecalho             logo, nome, botão de ajustes (abre a aba Sobre)
├── <main>                uma tela por aba
│   ├── TelaInicio
│   │   ├── PainelClima          chuva nas próximas 3 h e temperatura
│   │   ├── MapaBase             mapa Leaflet + controles
│   │   ├── PainelRisco          não avaliado / seguro / em risco
│   │   ├── Instrucoes + BotaoSocorro
│   │   └── BarraMonitoramento
│   ├── MapaBase          aba Mapa (mesmo componente, em tela cheia)
│   ├── TelaEmBreve       aba Alertas (provisória)
│   └── TelaSobre         informações e modo demonstração
└── NavegacaoInferior     Início · Mapa · Alertas · Sobre
```

- A aba ativa e o estado de risco ficam em `App.tsx` (`useState`); não há
  roteador nem biblioteca de estado.
- Os painéis recebem os dados por propriedades opcionais. **Sem dados, mostram
  "—" / "Sem dados"** em vez de valores fictícios; o botão de socorro fica
  desativado enquanto não houver ação ligada a ele.
- Ícones: SVG embutido em `components/ui/Icone.tsx`, sem biblioteca externa.
- Estilos: CSS puro em `src/styles/global.css`, com variáveis de cor do tema.
- A moldura de celular é ativada por media query (`min-width: 600px`).

## Mapa

- `components/mapa/MapaBase.tsx` usa o Leaflet diretamente (sem `react-leaflet`):
  o mapa é criado uma vez em um `useEffect` e guardado em um `ref`.
- Configuração em `config/mapa.ts`: provedores, centro, zoom inicial/mínimo/máximo
  e folga dos limites.
- O mapa é travado em Pernambuco com `maxBounds` (limites de PE + folga) e
  `minZoom`.
- Os controles (aproximar, afastar, centralizar, trocar camada) são botões React
  sobre o mapa; a escala é o controle nativo do Leaflet, só em metros/km.
- Se nenhuma imagem do mapa base carregar, aparece um aviso sobre o mapa.
- Um `ResizeObserver` recalcula o tamanho do mapa quando o painel muda.
- `domain/geografia.ts` tem as funções puras de limites (`dentroDePernambuco`,
  `expandirLimites`). A cobertura usa o **retângulo** que envolve o estado, não o
  contorno exato — aceita trechos de estados vizinhos dentro do retângulo.
- Limitação conhecida: a tela inicial e a aba Mapa criam instâncias separadas do
  mapa, então posição e zoom não são preservados ao trocar de aba.

## Estado atual (etapa 3)

Layout completo, navegação entre abas e mapa base funcional. Ainda sem
localização, relevo, clima e análise de risco reais; o estado de risco só muda
pelo modo demonstração.
