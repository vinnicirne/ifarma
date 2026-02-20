# 🔍 Guia de Diagnóstico - Erro "Failed to fetch"

## Passos para Identificar o Problema

### 1. Execute o SQL no Supabase

Primeiro, tente **desabilitar completamente o RLS** para isolar o problema:

```sql
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
```

### 2. Abra o Console do Navegador

1. Abra http://localhost:5174 no navegador
2. Pressione **F12** para abrir o DevTools
3. Vá para a aba **Console**
4. Tente fazer login

### 3. Verifique os Logs

Agora o código tem logs detalhados. Você verá mensagens como:

**Se o login funcionar:**
```
🔐 Tentando fazer login com: viniciuscirne@gmail.com
✅ Login bem-sucedido!
👤 Buscando perfil para userId: bbb1e814-107e-4889-bbe7-8453b576034b
✅ Perfil encontrado: {id: "...", email: "...", role: "admin"}
```

**Se houver erro:**
```
🔐 Tentando fazer login com: viniciuscirne@gmail.com
❌ Erro no login: [mensagem do erro]
Detalhes do erro: {message: "...", status: ..., name: "..."}
```

OU

```
✅ Login bem-sucedido!
👤 Buscando perfil para userId: ...
❌ Erro ao buscar perfil: [detalhes do erro]
```

### 4. Me Envie os Logs

Copie TODAS as mensagens do console (especialmente as que começam com 🔐, ❌, ✅, 👤) e me envie aqui.

### 5. Verifique a Aba Network

Na aba **Network** do DevTools:
1. Filtre por "profiles" ou "auth"
2. Veja se há alguma requisição em vermelho (failed)
3. Clique nela e veja o erro detalhado

## Scripts SQL Disponíveis

### Opção 1: Desabilitar RLS (Teste)
```sql
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
```

### Opção 2: Políticas Corrigidas
```sql
-- Já executado anteriormente
-- Ver arquivo: fix_rls_login.sql
```

## Próximos Passos

Após coletar os logs, poderei identificar se o problema é:
- ❌ Autenticação do Supabase
- ❌ Políticas RLS
- ❌ Configuração de CORS
- ❌ Perfil não existe no banco
- ❌ Outro problema de rede
