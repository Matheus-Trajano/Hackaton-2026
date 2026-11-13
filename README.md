# Encosta Segura

Protótipo (MVP) de um aplicativo mobile que avisa quando o usuário está em uma
encosta com risco de deslizamento, cruzando a localização do dispositivo, a
inclinação do terreno e a previsão de chuva. Cobertura inicial: Pernambuco.

> **Estado atual:** etapa 5 de 10 concluída (layout mobile, mapa base, localização e mapa de calor de altitude; grade de setores, clima e análise de risco ainda não integrados). Veja
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
  hooks/        hooks React (relógio, localização; depois clima e setor atual)
  services/     clientes das APIs externas (terreno/altitude)
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
demonstração* para alternar o estado de risco (não avaliado / seguro / em risco)
enquanto a análise real não está ligada.

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
