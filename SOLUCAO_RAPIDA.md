# ⚡ SOLUÇÃO RÁPIDA - Reiniciar Servidor

O erro "Failed to fetch" geralmente acontece quando:

1. **As variáveis de ambiente não foram carregadas** pelo Vite
2. **O servidor não foi reiniciado** após modificar o `.env`

## Solução:

### 1. Pare o servidor atual
No terminal onde está rodando `npm run dev`, pressione **Ctrl+C**

### 2. Reinicie o servidor
```bash
npm run dev
```

### 3. Teste novamente
1. Abra http://localhost:5174
2. Tente fazer login
3. Verifique o console - deve aparecer:
   ```
   🔧 Configuração Supabase:
   URL: https://ztxdqzqmfwgdnqpwfqwf.supabase.co
   Anon Key: eyJhbGciOiJIUzI1NiI...
   ✅ Variáveis de ambiente carregadas com sucesso
   ✅ Cliente Supabase criado
   ```

Se aparecer `❌ ERRO: Variáveis de ambiente do Supabase não encontradas!`, o problema é que o Vite não está lendo o arquivo `.env`.

## Alternativa: Verificar se o .env está correto

Execute no terminal:
```bash
cat .env
```

Deve mostrar:
```
VITE_SUPABASE_URL=https://ztxdqzqmfwgdnqpwfqwf.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

**IMPORTANTE**: As variáveis DEVEM começar com `VITE_` para o Vite reconhecer!
