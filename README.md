# Encosta Segura

Protótipo (MVP) de um aplicativo mobile que avisa quando o usuário está em uma
encosta com risco de deslizamento, cruzando a localização do dispositivo, a
inclinação do terreno e a previsão de chuva. Cobertura inicial: Pernambuco.

> **Estado atual:** etapa 2 de 10 concluída (layout mobile; mapa, clima e análise de risco ainda não integrados). Veja
> [docs/PLANO.md](docs/PLANO.md).

## Stack

React + TypeScript + Vite · Vitest + Testing Library · ESLint · deploy na Vercel.

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
    telas/      uma tela por aba
    ui/         peças reutilizáveis (ícones)
  hooks/        hooks React (relógio; depois geolocalização, clima, setor atual)
  services/     clientes das APIs externas
  domain/       lógica pura e testada (grade, inclinação, risco)
  config/       constantes (limites de PE, tamanho do setor, etc.)
  types/        tipos compartilhados
  styles/       CSS global e tema
tests/          testes automatizados
```

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
