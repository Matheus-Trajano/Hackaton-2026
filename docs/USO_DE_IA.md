# Uso de IA no desenvolvimento do Encosta Segura

Este documento registra como a inteligência artificial foi usada no projeto, do
início até a versão 1.5.0, e para que serviu cada uso.

## Resumo

- **Ferramenta:** um agente de IA de programação, no Modo Agente da Arena.ai,
  trabalhando direto no repositório `Matheus-Trajano/Hackaton-2026`. A
  plataforma usa modelos de diferentes fornecedores; o modelo específico não é
  informado ao usuário.
- **Forma de trabalho:** conversa em português. O responsável pelo projeto
  descrevia o que queria (texto e capturas de tela); o agente planejava,
  escrevia o código, os testes e a documentação, rodava as verificações e
  abria os pull requests. O responsável decidia, conferia no celular e
  autorizava cada merge.
- **Alcance:** praticamente todo o código, os testes e a documentação do
  repositório foram escritos pelo agente de IA, a partir dos pedidos e das
  decisões do responsável.
- **O app em si não usa IA.** A classificação de inclinação e de risco é feita
  por regras fixas e cálculo (método de Horn + previsão de chuva). Nenhum modelo
  de IA roda no aplicativo nem é consultado por ele.

## Quem fez o quê

| Parte | Responsável humano | Agente de IA |
|---|---|---|
| Ideia do app, público e requisitos | Definiu | — |
| Imagem de referência da tela | Forneceu | Interpretou e reproduziu o layout |
| Plano em 10 etapas | Aprovou | Propôs e escreveu |
| Escolha de tecnologias e APIs | Aprovou | Pesquisou, comparou e propôs |
| Código, testes e documentação | Revisou pelo resultado | Escreveu |
| Faixas de inclinação e regras de risco | **Definiu os valores** | Implementou; propôs padrões quando faltava definição |
| Teste no celular e com dados reais | Fez | Não tem como fazer (sem navegador nem GPS) |
| Merge dos pull requests e publicação na Vercel | Autorizou / fez | Executou o merge quando pedido |

## Todos os usos, em ordem

### 1. Planejamento e arquitetura

- Leitura da imagem de referência (tela escura estilo Defesa Civil) e tradução
  em estrutura de telas e componentes.
- Divisão do trabalho em 10 etapas, cada uma com verificação própria
  (`docs/PLANO.md`).
- Escolha da base técnica: React + TypeScript + Vite, Leaflet, Vitest, PWA com
  service worker próprio, função serverless na Vercel (`docs/ARQUITETURA.md`).

### 2. Pesquisa e escolha de fontes de dados

- Levantamento de APIs gratuitas e sem chave para relevo, clima, mapa base e
  localização (`docs/APIS.md`): AWS Terrain Tiles, Open-Meteo, Esri World
  Imagery, OpenStreetMap, Geolocation do navegador.
- Pesquisa de modelos de terreno sem prédios (FABDEM, ANADEM, PE3D) quando se
  discutiu o efeito dos prédios na altitude.
- Pesquisa dos critérios oficiais de risco em encostas (metodologia Ministério
  das Cidades/IPT, Lei 6.766/79, limiares de chuva do Cemaden), usada para
  explicar ao responsável que as regras do app são parâmetros de protótipo, não
  critérios oficiais.

### 3. Escrita do código (etapas 1 a 10, PRs #1 a #11)

| Etapa | O que a IA escreveu |
|---|---|
| 1 | Estrutura do projeto, configuração de lint, tipos, testes e build, `vercel.json` |
| 2 | Layout para celular: cabeçalho, tela inicial, navegação inferior, tema escuro |
| 3 | Mapa base de Pernambuco com zoom, centralizar e escala |
| 4 | Geolocalização: GPS real, modo simulado, marcador e coordenadas |
| 5 | Mapa de calor de altitude: leitura dos tiles de relevo, escala de cores, legenda |
| 6 | Grade de setores de 100 m e cálculo de inclinação por setor (método de Horn) |
| 7 | Previsão do tempo no painel superior (chuva nas próximas 3 h e temperatura) |
| 8 | Motor de risco (inclinação × chuva) e painel com instruções |
| 9 | Botão "Pedir socorro", rota `/api/alerta` simulada, ligação para o 199, aba Alertas |
| 10 | App instalável (PWA), aviso de falta de internet, tratamento de falhas, documentação final |

### 4. Testes automatizados

- A IA escreveu todos os testes (de 3 na etapa 1 a 298 na versão 1.5.0):
  cálculo de inclinação com terrenos sintéticos, limites das faixas, matriz
  completa inclinação × chuva, fluxo do GPS até o painel, rota de alerta, PWA.
- A cada entrega a IA rodou `npm run verificar` (lint, tipos, testes e build) e
  informou o resultado.

### 5. Diagnóstico e correção de erros

- Correção do cálculo de inclinação com dados reais (versão 0.8.1): a consulta
  de altitude recebia um argumento a mais e devolvia valores errados; a IA
  localizou a causa e corrigiu.
- Correção de laços de atualização em componentes, de erros de configuração do
  TypeScript e de testes de mapa em ambiente sem navegador.

### 6. Mudanças pedidas depois da versão 1.0.0

| Versão | Pedido do responsável | O que a IA fez | Situação |
|---|---|---|---|
| — | Trocar a fonte de relevo por uma sem prédios | Implementou tiles próprios e um conversor | **Removido a pedido** |
| 1.1.0 (PR #12) | Inclinação em graus, risco a partir de 20° | Implementou | **Desfeito a pedido** (PR #14): o resultado no uso real não agradou |
| 1.0.1 (PR #15) | Legenda em graus | Converteu os textos da legenda | Publicado |
| 1.2.0 (PR #16) | Faixas 0°–15°, 15°–45°, 45° ou mais | Reclassificou pelo ângulo | Substituído pela 1.4.0 |
| 1.3.0 (PR #16) | Alerta de alagamento em setor normal | Criou o alerta e as orientações | Publicado |
| 1.3.1 (PR #17) | Painel de risco em graus | Trocou o percentual pelo ângulo | Publicado |
| 1.4.0 (PR #18) | Quatro faixas: 0°–11°, 11°–20°, 20°–45°, 45° ou mais | Recriou a faixa "Moderado" | Publicado |
| 1.5.0 (PR #19) | Botões para ocultar os painéis do mapa; setor em graus | Implementou | Publicado |

### 7. Documentação

- A IA escreveu e manteve `README.md`, `docs/PLANO.md`, `docs/ARQUITETURA.md`,
  `docs/APIS.md`, `docs/DEPLOY.md`, `docs/CHANGELOG.md` e este documento.

### 8. Controle de versão

- Commits, pull requests (#1 a #19) e merges foram executados pela IA, sempre a
  pedido do responsável. Duas entregas foram desfeitas com `git revert`.
- O PR #13 foi fechado sem merge e refeito como PR #14.

### 9. Explicações ao responsável

- Respostas sem alteração de código: como instalar o app no Android, como a
  inclinação é calculada, por que prédios aparecem na altitude, como a Defesa
  Civil classifica risco.

## O que a IA não fez

- **Não testou em aparelho real.** O ambiente da IA não tem navegador, GPS nem
  acesso às APIs de mapa e clima. Aparência, tiles reais, GPS, instalação no
  Android, ligação para o 199 e a rota de alerta na Vercel foram conferidos (ou
  ficaram por conferir) pelo responsável.
- **Não validou as regras de risco.** Os limites de inclinação e as regras de
  chuva foram definidos pelo responsável ou propostos como padrão de protótipo.
  Não foram comparados com mapeamento oficial nem com relevo real.
- **Não gerou as imagens do app.** Até a versão 1.5.0 os ícones eram desenhos
  vetoriais escritos em código. A partir da 1.5.1 o logotipo é uma arte enviada
  pelo responsável, criada fora desta conversa (o agente escreveu um prompt de
  logotipo para o Gemini a pedido dele); o agente apenas recortou a arte e gerou
  os tamanhos por script (`scripts/gerar_icones.py`).
- **Não publicou o app.** A publicação na Vercel é feita pela conta do
  responsável.
- **Não roda dentro do app.** O alerta de socorro é simulado e nenhuma decisão
  do aplicativo é tomada por IA.

## Cuidados adotados no uso da IA

- Cada entrega passou por lint, verificação de tipos, testes e build antes do
  pull request.
- A IA declarou em cada entrega o que não pôde verificar.
- Painéis sem dados mostram "—" ou "Sem dados"; a IA não inseriu valores
  fictícios na interface.
- Nenhuma mudança foi publicada sem pedido explícito de merge.
- O histórico completo das mudanças está em `docs/CHANGELOG.md` e nos pull
  requests do repositório.

## Limite deste registro

Este documento foi escrito pelo próprio agente de IA, a partir do histórico do
repositório e do registro da conversa de desenvolvimento. Usos de IA feitos
fora dessa conversa (por exemplo, a criação da imagem de referência ou
pesquisas feitas pelo responsável em outras ferramentas) não estão listados
aqui e devem ser acrescentados pelo responsável, se existirem.
