# 📚 Índice de Documentação - Sistema Ifarma

Este diretório contém toda a documentação técnica do sistema de notificações push e correções realizadas.

---

## 📖 Documentação Principal

### [DOCUMENTACAO_ATUALIZACOES.md](./DOCUMENTACAO_ATUALIZACOES.md) ⭐
**Documentação completa de todas as atualizações e correções**
- Resumo executivo
- Implementações realizadas
- Arquivos criados e modificados
- Problemas identificados e soluções
- Guia de testes
- Próximos passos

---

## 🔔 Notificações Push

### [NOTIFICACOES_PUSH_SETUP.md](./NOTIFICACOES_PUSH_SETUP.md)
Guia completo de configuração do sistema de notificações push
- Checklist de configuração
- Passo a passo detalhado
- Configuração do Firebase
- Configuração do Supabase

### [TESTE_NOTIFICACOES.md](./TESTE_NOTIFICACOES.md)
Guia de testes para notificações push
- Teste de permissão e registro
- Teste manual via console
- Teste de notificação real
- Troubleshooting

---

## 🚀 Deploy

### [DEPLOY_EDGE_FUNCTION.md](./DEPLOY_EDGE_FUNCTION.md)
Instruções para deploy da Edge Function no Supabase
- Pré-requisitos
- Comandos de deploy
- Configuração de secrets
- Verificação

### [VERCEL_ENV_SETUP.md](./VERCEL_ENV_SETUP.md)
Configuração de variáveis de ambiente na Vercel
- Lista de variáveis necessárias
- Passo a passo na Vercel
- Verificação
- Segurança

---

## 🔧 Troubleshooting

### [SOLUCAO_LOGIN.md](./SOLUCAO_LOGIN.md)
Solução para problemas de login
- Erro "Failed to fetch"
- Correção de RLS
- Passo a passo

### [FIX_SUPABASE_RLS.sql](./FIX_SUPABASE_RLS.sql)
Script SQL para corrigir Row Level Security
- Desabilitar RLS (teste)
- Políticas corretas (produção)

---

## 👤 Configuração de Usuários

### [setup_admin.sql](./setup_admin.sql)
Script para criar/atualizar usuário admin
- Criar perfil admin
- Atualizar role
- Verificação

### [create_admin.sql](./create_admin.sql)
Script alternativo para criação de admin

---

## 🗄️ Banco de Dados

### [schema_completo.sql](./schema_completo.sql)
Schema completo do banco de dados
- Todas as tabelas
- Relacionamentos
- Índices

### [reset_database.sql](./reset_database.sql)
Script para resetar banco de dados
- Limpar dados
- Recriar estrutura

---

## ⚙️ Configuração

### [.env.example](./.env.example)
Exemplo de arquivo de variáveis de ambiente
- Supabase
- Google Maps
- Firebase Cloud Messaging

---

## 📊 Resumo Rápido

**Total de Documentos:** 12 arquivos

**Categorias:**
- 📖 Documentação: 1
- 🔔 Notificações: 2
- 🚀 Deploy: 2
- 🔧 Troubleshooting: 2
- 👤 Usuários: 2
- 🗄️ Banco de Dados: 2
- ⚙️ Configuração: 1

---

## 🎯 Por Onde Começar?

1. **Primeiro acesso?** → Leia [DOCUMENTACAO_ATUALIZACOES.md](./DOCUMENTACAO_ATUALIZACOES.md)
2. **Configurar notificações?** → Siga [NOTIFICACOES_PUSH_SETUP.md](./NOTIFICACOES_PUSH_SETUP.md)
3. **Problemas de login?** → Consulte [SOLUCAO_LOGIN.md](./SOLUCAO_LOGIN.md)
4. **Fazer deploy?** → Veja [DEPLOY_EDGE_FUNCTION.md](./DEPLOY_EDGE_FUNCTION.md)
5. **Testar sistema?** → Use [TESTE_NOTIFICACOES.md](./TESTE_NOTIFICACOES.md)

---

## 📝 Notas

- Todos os scripts SQL devem ser executados no SQL Editor do Supabase
- Variáveis de ambiente devem ser configuradas no `.env` local e na Vercel
- Sempre reiniciar servidor após alterar `.env`
- Documentação atualizada em: 27/01/2026

---

**Desenvolvido por:** Vinicius Cirne  
**Projeto:** Ifarma - PharmaLink Platform
