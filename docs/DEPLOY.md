# Deploy na Vercel

1. Em <https://vercel.com/new>, importe o repositório `Matheus-Trajano/Hackaton-2026`.
2. A Vercel detecta o Vite pelo `vercel.json`; não é preciso alterar nada:
   - Build: `npm run build`
   - Saída: `dist`
3. Clique em **Deploy**. Cada push na branch de produção gera um novo deploy.

Não há variáveis de ambiente no momento.

A pasta `api/` é publicada automaticamente como funções serverless: `api/alerta.ts`
vira a rota `/api/alerta`. Depois do deploy, confira com:

```bash
curl -X POST https://SEU-ENDERECO.vercel.app/api/alerta \
  -H 'Content-Type: application/json' -d '{"lat":-8.0153,"lon":-34.9125}'
```

A resposta esperada é o status 201 com um `protocolo`. Os alertas recebidos
aparecem nos logs da função, no painel da Vercel.

`vercel.json` redireciona todas as rotas (exceto `/api/*`) para `index.html`.

> Ainda não foi feito nenhum deploy; a configuração será validada na etapa 10.
