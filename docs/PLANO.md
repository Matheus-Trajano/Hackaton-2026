# Plano de desenvolvimento

Dez etapas. Cada uma termina com: verificação (`npm run verificar` + conferência
indicada), atualização da documentação e um commit.

| # | Etapa | Verificação | Estado |
|---|---|---|---|
| 1 | Estrutura do projeto, configuração, documentação inicial, `vercel.json` | Lint, tipos, teste de exemplo e build | ✅ Concluída |
| 2 | Layout mobile: cabeçalho, moldura de celular, navegação inferior, tema escuro | Build, testes de interface e conferência visual | ✅ Concluída |
| 3 | Mapa base centrado em Pernambuco, com zoom, centralizar e escala | Testes do mapa e dos limites; conferência visual | ✅ Concluída |
| 4 | Geolocalização: GPS real, modo simulado, marcador e coordenadas | Testes de permissão negada, ponto fora de PE e modo simulado | ✅ Concluída |
| 5 | Altitude: leitura dos tiles, mapa de calor e legenda | Testes da conversão de altitude | ⏳ Pendente |
| 6 | Grade de 100 m e cálculo de inclinação por setor | Testes com terrenos sintéticos | ⏳ Pendente |
| 7 | Painel superior de clima (chuva nas próximas 3 h, temperatura) | Testes com respostas simuladas | ⏳ Pendente |
| 8 | Motor de risco e painel inferior com instruções | Testes da combinação inclinação × chuva | ⏳ Pendente |
| 9 | Botão "Pedir socorro", `/api/alerta`, ligação 199, aba de alertas | Teste do endpoint e do fluxo | ⏳ Pendente |
| 10 | Acabamento: PWA, tratamento de falhas, documentação final, deploy | Todos os testes, build e roteiro manual | ⏳ Pendente |

## Regras de negócio já definidas

- Setores da grade: 100 m × 100 m.
- Classes de inclinação: Baixo < 5% · Moderado 5–15% · Alto 15–30% · Muito alto > 30%.
- Mapa de calor de altitude: mais claro = mais baixo, mais vermelho = mais alto.
- Risco final = inclinação do setor do usuário cruzada com a previsão de chuva.
- Cobertura: Pernambuco.

## Resultado da verificação — etapa 1

- `npm run lint`: sem erros.
- `npm run typecheck`: sem erros.
- `npm run test`: 3 testes, 3 aprovados.
- `npm run build`: build de produção gerado em `dist/`.

## Resultado da verificação — etapa 2

- `npm run lint` e `npm run typecheck`: sem erros.
- `npm run test`: 8 testes, 8 aprovados (6 novos de interface: estrutura da tela,
  ausência de dados inventados, troca de abas, botão de ajustes e os dois
  estados do modo demonstração).
- `npm run build`: build de produção gerado.
- Conferência visual: **pendente do usuário** — o ambiente de desenvolvimento não
  tem navegador, então a aparência não foi conferida por captura de tela.

## Resultado da verificação — etapa 3

- `npm run lint` e `npm run typecheck`: sem erros.
- `npm run test`: 24 testes, 24 aprovados (16 novos: limites de Pernambuco com
  cidades dentro e fora, criação do mapa, zoom com limite mínimo, centralizar,
  troca de camada e aba Mapa em tela cheia).
- `npm run build`: build de produção gerado.
- **Não verificado no ambiente de desenvolvimento:** o carregamento real das
  imagens do mapa (Esri e OpenStreetMap), porque o ambiente não acessa esses
  servidores nem tem navegador. Precisa ser conferido no preview.

## Resultado da verificação — etapa 4

- `npm run lint` e `npm run typecheck`: sem erros.
- `npm run test`: 42 testes, 42 aprovados (18 novos: tradução de erros, avisos,
  pontos de demonstração dentro de PE, navegador sem suporte, permissão negada,
  posição fora de PE, falha passageira, troca GPS ↔ demonstração, marcador e
  coordenadas no mapa, fluxo completo no app).
- `npm run build`: build de produção gerado.
- Os testes usam um GPS simulado. **Não verificado:** a leitura do GPS de um
  aparelho real e a aparência do marcador; precisam ser conferidas no preview.
