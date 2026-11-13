# Deploy na Vercel

1. Em <https://vercel.com/new>, importe o repositório `Matheus-Trajano/Hackaton-2026`.
2. A Vercel detecta o Vite pelo `vercel.json`; não é preciso alterar nada:
   - Build: `npm run build`
   - Saída: `dist`
3. Clique em **Deploy**. Cada push na branch de produção gera um novo deploy.

Não há variáveis de ambiente no momento.

`vercel.json` redireciona todas as rotas (exceto `/api/*`) para `index.html`.

> Ainda não foi feito nenhum deploy; a configuração será validada na etapa 10.
