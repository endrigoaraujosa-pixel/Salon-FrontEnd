# PWA online — instalação e validação

O aplicativo pode ser instalado e abre em janela independente. As rotinas continuam online. O service worker armazena somente `/offline.html`, uma tela genérica sem dados de clientes. Não há fila de gravações, sincronização em segundo plano nem cache PWA de agendas, pagamentos, APIs ou fotos. O cache HTTP normal do navegador continua seguindo os cabeçalhos existentes.

## Publicação

- Publicar o frontend completo com seu Dockerfile/Nginx atualizado. Não exige alteração de backend, banco, variáveis de ambiente ou migration.
- Em produção, usar HTTPS válido no frontend e na API. `localhost` permite desenvolvimento; HTTP por IP de rede não substitui HTTPS em celulares.
- Preservar `/sw.js`, `/offline.html`, `/pwa-health.txt`, `/manifest.json` e os ícones. Não redirecionar esses arquivos para a página de login. O service worker só é registrado em build de produção, não em `npm run dev`.
- No agendamento público, o Nginx gera o manifesto com `?loja=...`: não substituir essa rota por um JSON estático. Vite dev/preview também implementa essa rota pelo plugin local. O `id` e `start_url` preservam a empresa do link original.
- Não incluir `.env`, `node_modules`, `dist`, backups ou arquivos temporários no GitHub. Os PNGs em `public` são necessários.

## Testes manuais

1. Acessar online em Chrome/Edge ou Android: quando o navegador oferecer instalação, usar “Instalar aplicativo”. Confirmar o ícone e a abertura em janela independente. A oferta depende do navegador e pode não aparecer após uma dispensa anterior.
2. No iPhone/iPad, abrir no Safari e usar Compartilhar → Adicionar à Tela de Início. Validar em aparelho real; o navegador de teste desktop não comprova a instalação no iOS.
3. Abrir a página pública pelo link com `?loja=NOME`, instalar e abrir pelo ícone. Confirmar a empresa correta. Repetir com outra loja.
4. Abrir um formulário, preencher sem salvar, desativar a conexão e verificar o aviso de falta de conexão. Escape não deve permitir editar a tela por trás. Reconectar: os campos permanecem na mesma tela, sem envio automático.
5. Após uma visita online, fechar o aplicativo, desligar a conexão e abrir pelo ícone: deve aparecer a tela genérica offline. “Tentar novamente” deve informar indisponibilidade. Reconectar e tentar de novo: o aplicativo deve abrir. No primeiro acesso, sem instalação prévia do service worker, a tela offline pode ainda não estar disponível.
6. Com conexão ativa, validar login, agenda, novo/edição de agendamento, fotos e zoom, clientes, pagamentos, relatórios e logout com uma conta de teste. No público, validar serviços, profissional, horários e confirmação com dados de teste.
7. Em DevTools → Application → Cache Storage, o cache `salon-*-offline-v1` deve conter somente `/offline.html`. APIs e fotos não devem aparecer nele. Atualizar a versão sem descartar formulários em andamento.

## Validação executada em 18/09/2026

- Builds de produção dos dois frontends aprovados.
- 12 testes automatizados aprovados: 10 de PWA/manifesto e 2 já existentes de segurança da API pública.
- Nginx público validado: JSON por loja, tipo MIME e rejeição de parâmetros inválidos.
- Navegador local: painel abre, página pública carrega a loja, servidor temporário desligado produz fallback offline e sua restauração permite reconectar à mesma loja.
- Componente de aviso testado isoladamente no navegador: bloqueio modal, Escape e preservação de campo após reconexão aprovados.
- Instalação nativa Android/iOS e rotinas completas em produção precisam da homologação acima. Não foram simuladas transações reais, senhas ou mensagens.
