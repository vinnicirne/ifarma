# 🚨 SOLUÇÃO: Erro no Castro de Parceiros

## ❌ **PROBLEMA IDENTIFICADO**

O erro **`Could not find the 'delivery_enabled' column of 'pharmacies'`** indica que o formulário de Cadastro de Parceiros (`/partner/register`) está tentando salvar dados que o Banco de Dados não tem.

Faltam as colunas: `delivery_enabled`, `specialty`, `owner_cpf`, `owner_rg`, etc.

---

## ✅ **SOLUÇÃO: ATUALIZAR TABELA PHARMACIES**

Criei um script SQL para adicionar todas as colunas necessárias para o registro completo.

### **PASSO 1: Executar Script SQL**

1. Acesse o **Supabase SQL Editor**: https://supabase.com/dashboard/project/gtjhpkakousmdrzjpdat/sql/new
2. Abra o arquivo **`UPDATE_PHARMACIES_PARTNER_REGISTRATION.sql`** que criei na sua área de trabalho.
3. Copie **TODO** o conteúdo.
4. Cole no SQL Editor do Supabase.
5. Clique em **RUN**.

### **PASSO 2: Recarregar o Schema**

1. No painel do Supabase, aguarde alguns segundos.
2. No Frontend: **Recarregue a página (F5)**.

### **PASSO 3: Testar Cadastro**

1. Preencha o formulário de parceiro novamente.
2. Clique em **"Concluir Cadastro"**.
3. Agora deve salvar com sucesso! ✅

---

## ⚠️ **OBSERVAÇÃO SOBRE FIREBASE (FCM)**

Vi no console erros de `FirebaseError: Messaging...`. Isso indica que a configuração de notificações push pode precisar de ajustes, mas **NÃO BLOQUEIA** o cadastro no banco de dados. Focaremos nisso depois se necessário.
