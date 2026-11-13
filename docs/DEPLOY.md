# Deploy na Vercel

1. Em <https://vercel.com/new>, importe o repositório `Matheus-Trajano/Hackaton-2026`.
2. A Vercel detecta o Vite pelo `vercel.json`; não é preciso alterar nada:
   - Build: `npm run build`
   - Saída: `dist`
3. Clique em **Deploy**. Cada push na branch de produção gera um novo deploy.

Variáveis de ambiente: nenhuma é obrigatória. As opcionais `VITE_RELEVO_URL`,
`VITE_RELEVO_ZOOM_MAXIMO` e `VITE_RELEVO_NOME` trocam a fonte do relevo (veja
[RELEVO.md](RELEVO.md)); depois de alterá-las, refaça o deploy.

A pasta `api/` é publicada automaticamente como funções serverless: `api/alerta.ts`
vira a rota `/api/alerta`. Depois do deploy, confira com:

```bash
curl -X POST https://SEU-ENDERECO.vercel.app/api/alerta \
  -H 'Content-Type: application/json' -d '{"lat":-8.0153,"lon":-34.9125}'
```

A resposta esperada é o status 201 com um `protocolo`. Os alertas recebidos
aparecem nos logs da função, no painel da Vercel.

`vercel.json` redireciona todas as rotas (exceto `/api/*`) para `index.html`.

Também define que `sw.js` nunca fica em cache (para atualizações chegarem) e que
`/assets/` pode ficar em cache por um ano (os nomes mudam a cada build).

> Ainda não foi feito nenhum deploy. A configuração foi conferida apenas
> localmente; o primeiro deploy é o teste real dela.

## Conferência depois do deploy

1. Abra o endereço no computador: o app carrega e o mapa aparece.
2. Rode o `curl` acima: resposta 201 com protocolo.
3. No Chrome do computador, abra as ferramentas de desenvolvedor → Application:
   - **Manifest**: nome, ícones, sem erros de instalação;
   - **Service workers**: `sw.js` ativo.
4. Recarregue, marque "Offline" na aba Network e recarregue de novo: a interface
   abre com a faixa "Sem internet".

## Instalar no Android

1. Abra o endereço da Vercel no Chrome do celular.
2. Aba **Sobre** → **Instalar app**. Se o botão não aparecer, use o menu (⋮) do
   Chrome → "Instalar app" ou "Adicionar à tela inicial".
3. Abra pelo ícone na tela inicial e permita o acesso à localização.

Se a instalação não for oferecida: confirme que o endereço começa com
`https://`, que não está em aba anônima e recarregue a página uma vez (o service
worker é registrado na primeira visita).
