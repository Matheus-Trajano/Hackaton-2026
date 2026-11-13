# Encosta Segura

Protótipo (MVP) de um aplicativo mobile que avisa quando o usuário está em uma
encosta com risco de deslizamento, cruzando a localização do dispositivo, a
inclinação do terreno e a previsão de chuva. Cobertura inicial: Pernambuco.

> **Estado atual:** etapa 8 de 10 concluída (mapa, localização, relevo, grade de 100 m, inclinação, previsão do tempo e análise de risco funcionando; o botão de emergência ainda não envia alertas). Veja
> [docs/PLANO.md](docs/PLANO.md).

## Stack

React + TypeScript + Vite · Leaflet (mapa) · Vitest + Testing Library · ESLint · deploy na Vercel.

## Como rodar

```bash
npm install
npm run dev        # servidor de desenvolvimento (porta 5173)
npm run verificar  # lint + tipos + testes + build (rodar ao fim de cada etapa)
```

| Script | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Checagem de tipos + build de produção em `dist/` |
| `npm run preview` | Serve o build de produção |
| `npm run lint` | ESLint |
| `npm run typecheck` | Checagem de tipos |
| `npm run test` | Testes (Vitest) |
| `npm run verificar` | Tudo acima, em sequência |

## Estrutura

```
api/            função serverless da Vercel (alerta de socorro) — etapa 9
docs/           documentação (plano, arquitetura, APIs, deploy, changelog)
public/         ícones e manifesto — etapa 10
src/
  components/
    layout/     moldura de celular, cabeçalho, navegação inferior
    inicio/     painéis da tela inicial (clima, mapa, risco, instruções, socorro)
    mapa/       mapa base (Leaflet) e seus controles
    telas/      uma tela por aba
    ui/         peças reutilizáveis (ícones)
  hooks/        hooks React (relógio, localização, altitude, setor atual, clima)
  services/     clientes das APIs externas (terreno/altitude, clima)
  domain/       lógica pura e testada (grade, inclinação, risco)
  config/       constantes (limites de PE, setor, provedores do mapa, pontos de demonstração)
  types/        tipos compartilhados
  styles/       CSS global e tema
tests/          testes automatizados
```

## Mapa

Mapa base em Leaflet, centrado em Pernambuco e travado na região do estado
(com uma pequena folga). Controles: aproximar, afastar, centralizar em
Pernambuco e trocar a camada (satélite Esri ↔ ruas OpenStreetMap), além da
escala métrica. O mesmo componente aparece na tela inicial e, em tela cheia,
na aba **Mapa**.

## Relevo (mapa de calor)

Por cima do mapa base, o app pinta a altitude do terreno: **mais claro = mais
baixo, mais vermelho = mais alto**. O mar fica transparente. A escala vai de 0 a
1.000 m ou mais e não é linear, para que os morros do litoral (dezenas de metros)
apareçam tão bem quanto as serras do interior. O botão com o ícone de montanha
liga e desliga a camada; a legenda fica no canto superior esquerdo. Com a
localização ativa, a caixa de coordenadas mostra também a altitude do ponto.

Os dados vêm dos AWS Terrain Tiles (resolução de origem de cerca de 30 m).

## Análise de risco

O painel inferior cruza a **inclinação do setor de 100 m em que o usuário está**
com a **previsão de chuva** do mesmo local:

| Inclinação do setor | Chuva moderada ou mais forte | Sem chuva significativa | Previsão indisponível |
|---|---|---|---|
| Alta ou muito alta (≥ 15%) | **Risco** ("Você está em risco!") | **Risco** ("Você está em área de risco") | **Risco** |
| Moderada (5% a < 15%) | **Atenção** | Seguro | **Atenção** (por cautela) |
| Baixa (< 5%) | Seguro | Seguro | Seguro |

- Um setor de inclinação alta ou muito alta é zona de risco com ou sem chuva; a
  chuva agrava o alerta.
- Sem localização ou sem dados de relevo, o painel mostra "Risco ainda não
  avaliado" e o motivo — o app não supõe segurança.
- Em risco, aparecem as instruções "O que fazer agora"; em atenção, "Fique
  atento"; nos demais casos, dicas de prevenção.
- O app avalia apenas risco de **deslizamento em encosta**. Alagamento em área
  plana não é avaliado.

Estas regras são parâmetros do protótipo (`src/config/risco.ts`), não critérios
oficiais da Defesa Civil.

## Previsão do tempo

O painel superior mostra, para a posição do usuário, a previsão das **próximas
3 horas**: maior probabilidade de chuva, intensidade, temperatura atual, o
detalhe hora a hora e o volume total previsto. Os dados vêm da Open-Meteo e são
atualizados a cada 10 minutos (ou 1 minuto depois de uma falha).

| Intensidade | Maior volume em uma hora |
|---|---|
| Sem chuva | < 0,1 mm |
| Chuva fraca | 0,1 a < 5 mm |
| Chuva moderada | 5 a < 25 mm |
| Chuva forte | 25 a < 50 mm |
| Chuva muito forte | ≥ 50 mm |

Sem localização utilizável, a previsão é a de Recife, e o painel informa isso.
Se a consulta falhar, o painel mostra "Sem dados" em vez de números.

## Grade de setores e inclinação

O território é dividido em setores de **100 m × 100 m**. Com o mapa aproximado
(zoom 15 ou mais), a grade é desenhada sobre o mapa. O botão com o ícone de
grade pinta cada setor pela sua classe de inclinação:

| Classe | Inclinação | Cor |
|---|---|---|
| Baixo | < 5% | verde |
| Moderado | 5% – 15% | amarelo |
| Alto | 15% – 30% | laranja |
| Muito alto | > 30% | vermelho |

A posição do usuário é cruzada com a grade: o setor em que ele está ganha um
contorno reforçado e a caixa de coordenadas mostra a inclinação desse setor.
Altitude e inclinação são exibidas uma de cada vez.

A inclinação de um setor é calculada a partir da altitude de 9 pontos dele
(cantos, meios das bordas e centro), pelo método de Horn.

## Localização

Ao abrir, o app pede a localização do aparelho (GPS) e a acompanha
continuamente. Com a posição dentro de Pernambuco, o mapa mostra o marcador, as
coordenadas e a precisão, e foca no usuário.

Se a permissão for negada, a localização falhar ou o usuário estiver fora de
Pernambuco, o mapa mostra um aviso com o botão **Usar local de demonstração**.
Na aba **Sobre** é possível escolher entre o GPS e sete locais de demonstração
na Região Metropolitana do Recife (morros e áreas planas; coordenadas
aproximadas).

> A geolocalização do navegador exige HTTPS (a Vercel já fornece) e pode ser
> bloqueada quando o app está embutido em outra página (iframe); nesse caso,
> abra o endereço do app diretamente em uma aba.

## Simulação do dispositivo

Em telas largas (≥ 600 px) o app aparece dentro de uma moldura de celular; em
um celular real, ocupa a tela inteira. Na aba **Sobre** há um *modo
demonstração*: em "Automático" (padrão) o painel de risco usa os dados reais; as
outras opções forçam um estado (seguro / atenção / em risco), e o painel avisa
que o estado é simulado.

## Documentação

- [Plano de desenvolvimento](docs/PLANO.md)
- [Arquitetura](docs/ARQUITETURA.md)
- [APIs utilizadas](docs/APIS.md)
- [Deploy na Vercel](docs/DEPLOY.md)
- [Histórico de mudanças](docs/CHANGELOG.md)

## Aviso

Este é um protótipo. Os dados de relevo têm resolução aproximada de 30 m e a
classificação de risco **não substitui** o mapeamento oficial da Defesa Civil.
O botão de emergência será simulado no MVP. Em emergência real, ligue **199**.
