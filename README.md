# GAAP Gestão de Serviços

Sistema da **GAAP ENGENHARIA** para controle de ordens de serviço, horas trabalhadas,
orçamentos, fechamentos e valores a receber.

- **Site:** hospedado na Vercel (site estático, sem etapa de build)
- **Banco, login e fotos:** Supabase (Postgres + Auth + Storage)

## Estrutura

| Arquivo | O que é |
|---|---|
| `index.html` | Página do sistema |
| `app.js` | Toda a lógica (cálculo de horas, relatórios, dashboard, login) |
| `style.css` | Visual |
| `config.js` | Endereço e chave **pública** (anon) do Supabase |
| `logo.js`, `logo.jpg`, `icon-*.png`, `manifest.webmanifest` | Logo e ícones (pode instalar no celular) |
| `vercel.json` | Cabeçalhos de segurança e cache |
| `supabase/migrations/` | Estrutura completa do banco, regras de acesso e funções (rodar em ordem) |
| `supabase/functions/lembretes/` | Função do servidor que envia os lembretes no celular |
| `sw.js` | Recebe as notificações no celular |
| `.github/workflows/manter-ativo.yml` | Chama o banco todo dia para o plano gratuito não pausar |

## Como funciona o acesso

1. **A primeira conta criada vira o Responsável (dono)**: vê tudo, inclusive valores.
2. Quem se cadastrar depois fica **Aguardando liberação**.
3. Em **Ajustes → Acessos**, o responsável escolhe o nome do profissional e clica em **Liberar**.
4. O funcionário liberado só lança e vê **as próprias OS**, sem nenhum valor em R$.
   O banco remove os valores e força o nome dele; períodos já fechados ficam bloqueados.
5. Pelo mesmo painel dá para **Bloquear** um acesso.

## Configuração do Supabase (uma vez)

Em **Authentication → URL Configuration**:

- **Site URL:** o endereço do site na Vercel (ex.: `https://gaap-gestao.vercel.app`)
- **Redirect URLs:** o mesmo endereço com `/**` no final

Sem isso, os links de confirmação de e‑mail e de "esqueci a senha" apontam para `localhost`.

## Montar em outro projeto Supabase

1. Crie o projeto e rode os arquivos de `supabase/migrations/` em ordem no **SQL Editor**.
2. Copie a **Project URL** e a chave **anon** (Settings → API) para `config.js`.

## Publicar

Qualquer push na branch `main` (com o repositório ligado à Vercel) publica uma nova versão.
Também funciona servindo a pasta localmente: `python3 -m http.server 8080`.

## E-mails do Supabase em português

Os modelos estão em `supabase/emails/`. Para usar, abra **Authentication → Emails** no Supabase
e cole o conteúdo de cada arquivo no modelo correspondente:

| Modelo no Supabase | Assunto sugerido | Arquivo |
|---|---|---|
| Confirm signup | `Confirme seu e-mail – GAAP Gestão` | `confirmar-cadastro.html` |
| Reset password | `Redefinir sua senha – GAAP Gestão` | `recuperar-senha.html` |

## Rotinas automáticas

| O quê | Quando | Onde |
|---|---|---|
| Cópia dos dados no servidor (guarda 30 dias) | Todo dia às 03:00 | pg_cron `gaap-backup-diario` |
| Lembretes no celular (fim do expediente + 20 min) | Seg a sáb | pg_cron `gaap-lembretes` → função `lembretes` |
| Manter o banco ativo | Todo dia às 08:17 | GitHub Actions (se reativa sozinho) |
| Manter o banco ativo (reserva) | Todo dia às 11:23 | Vercel Cron → `/api/ping` |

As chaves das notificações (VAPID) e a senha do agendamento ficam na tabela `segredos`
do banco, que só o servidor lê. Elas **não** estão neste repositório.

## Montar em outro projeto Supabase (continuação)

3. Gere um par de chaves VAPID e grave em `segredos` (`vapid_publica`, `vapid_privada`); copie a pública para `config.js`.
4. Publique a função `supabase/functions/lembretes` com verificação de JWT desligada (ela confere a senha do agendamento).
