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
| `sw.js` | Recebe as notificações no celular e guarda o app para abrir sem internet |
| `aprovar.html`, `aprovar.js` | Página pública onde o cliente confere e aprova (ou contesta) uma medição pelo link |
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

## Funções principais

- **Horas e OS:** lançamento do dia em lote ou avulso, cronômetro, fotos antes/durante/depois com carimbo, equipamento e preventiva por OS.
- **Sem internet:** o app abre com os dados guardados no aparelho; lançamentos, cronômetro e fotos ficam numa fila e são enviados sozinhos quando a conexão volta (aviso "a enviar" no topo).
- **Financeiro:** fechamentos congelados, NF, vencimentos, retenções, glosas, recebimentos e o pacote do contador (.zip com planilha e comprovantes).
- **Fechamento para o fiscal:** no modelo pedido pela Brejeiro ("FECHAMENTO DE TERCEIROS - HORAS E VALORES"), em PDF ou Excel, com uma folha por centro (unidade). Os fechamentos de abril a setembro/2026 foram importados das planilhas aprovadas.
- **Unidades por empresa:** cada contratante tem sua lista (ex.: 1001 - ANÁPOLIS); ao lançar, escolhe na lista ou cria outra.
- **Adicional noturno:** horas entre 22h e 5h com o percentual de cada contratante (Brejeiro: 20%).
- **Prévia dos PDFs:** todo PDF abre para conferência antes de enviar ou baixar.
- **Aprovação da medição:** link pelo WhatsApp para o cliente aprovar ou contestar OS por OS (vale 30 dias).
- **Reajuste:** novo valor da hora com data de vigência (sugestão pelo IPCA do Banco Central) e carta de reajuste em PDF; lançamentos antigos mantêm o valor antigo.
- **Mais → Equipe:** acerto por período com vales e pagamentos e recibo em PDF; documentos (ASO, NRs, certidões) com aviso 30 dias antes de vencer.
- **Mais → Equipamentos:** cadastro por TAG, plano de preventivas e histórico de OS por equipamento.

## Migrações do banco

| Arquivo | O que faz |
|---|---|
| `008_seguranca.sql` | Validação de ids e campos, fotos só da própria pasta, período fechado sem diferenciar maiúsculas |
| `009_versao_e_restauracao.sql` | Controle de versão entre aparelhos (CONFLITO), restauração e importação seguras |
| `010_desempenho.sql` | Regras de acesso mais rápidas, uso do armazenamento, backup incremental de fotos |
| `011_ideias.sql` | Pagamentos da equipe, equipamentos, documentos (bucket `documentos`) e aprovação da medição pelo cliente |
| `012_vigencia_taxa.sql` | Valor da hora pela data do serviço (reajuste com vigência) também nos lançamentos dos funcionários |
| `013_ajustes_seguranca.sql` | Tira do acesso anônimo a criação de link de aprovação; índice para os lembretes |
| `014_unidades_por_empresa.sql` | Lista de unidades de cada contratante também para o funcionário |
| `015_adicional_noturno.sql` | Adicional noturno (22h às 5h) por contratante, inclusive nos lançamentos dos funcionários |
| `016_liberar_acesso.sql` | Liberar acesso em um passo (funcionário ou responsável), já confirmando o e-mail da pessoa |

## Rotinas automáticas

| O quê | Quando | Onde |
|---|---|---|
| Cópia dos dados no servidor (guarda 30 dias) | Todo dia às 03:00 | pg_cron `gaap-backup-diario` |
| Lembretes no celular (fim do expediente + 20 min) | Seg a sáb | pg_cron `gaap-lembretes` → função `lembretes` |
| "Para fazer hoje" para o responsável (início do expediente + 30 min): medições vencidas, NF a emitir, documentos vencendo, preventivas atrasadas | Seg a sáb | mesma função `lembretes` |
| Manter o banco ativo | Todo dia às 08:17 | GitHub Actions (se reativa sozinho) |
| Manter o banco ativo (reserva) | Todo dia às 11:23 | Vercel Cron → `/api/ping` |

As chaves das notificações (VAPID) e a senha do agendamento ficam na tabela `segredos`
do banco, que só o servidor lê. Elas **não** estão neste repositório.

## Montar em outro projeto Supabase (continuação)

3. Gere um par de chaves VAPID e grave em `segredos` (`vapid_publica`, `vapid_privada`); copie a pública para `config.js`.
4. Publique a função `supabase/functions/lembretes` com verificação de JWT desligada (ela confere a senha do agendamento).
