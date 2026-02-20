# 🧪 GUIA: CRIAR FARMÁCIA DE TESTE

## 📋 MÉTODO 1: Via Interface Web (RECOMENDADO)

### Passo 1: Acessar a Página de Criação
1. Abra o navegador
2. Acesse: `http://localhost:5173/dashboard/pharmacy/new`
3. Faça login como admin se necessário

### Passo 2: Preencher Dados do Estabelecimento
- **Nome Fantasia:** `Farmácia Teste Automatizada`
- **CNPJ:** `12.345.678/0001-99`
- **Telefone da Loja:** `(11) 3456-7890`
- **Plano Atual:** Selecione `Gratuito`

### Passo 3: Credenciais de Acesso (Gestor)
- **Email de Acesso:** `teste.automatizado@ifarma.com`
- **Senha Inicial:** `Teste123!@#`

### Passo 4: Endereço e Localização
- **CEP:** `01310-100`
- Aguarde o preenchimento automático (ViaCEP)
- **Número:** `1578`
- **Bairro:** `Bela Vista` (se não preenchido)
- **Latitude/Longitude:** Serão preenchidos automaticamente

### Passo 5: Salvar
1. Clique no botão **SALVAR** (canto superior direito)
2. Aguarde o processamento

### Passo 6: Verificar Resultado

#### ✅ SUCESSO:
- Mensagem: "Farmácia salva com sucesso!"
- Redirecionamento para lista de farmácias
- **PRÓXIMO PASSO:** Vá para "Verificação de Sucesso" abaixo

#### ❌ ERRO "non-2xx status code":
- Significa que a Edge Function falhou
- **PRÓXIMO PASSO:** Vá para "Troubleshooting" abaixo

---

## 🔍 VERIFICAÇÃO DE SUCESSO

### 1. Verificar Farmácia Criada
Execute no Supabase SQL Editor:
```sql
SELECT 
    id,
    name,
    owner_email,
    status,
    created_at
FROM pharmacies
WHERE owner_email = 'teste.automatizado@ifarma.com';
```

**Resultado Esperado:**
- 1 linha retornada
- `status` = 'approved'

### 2. Verificar Perfil do Merchant
```sql
SELECT 
    p.id,
    p.email,
    p.role,
    p.pharmacy_id,
    ph.name as pharmacy_name
FROM profiles p
LEFT JOIN pharmacies ph ON ph.id = p.pharmacy_id
WHERE p.email = 'teste.automatizado@ifarma.com';
```

**Resultado Esperado:**
- 1 linha retornada
- `pharmacy_id` NÃO é NULL
- `pharmacy_name` = 'Farmácia Teste Automatizada'

### 3. Testar Login
1. Faça logout
2. Faça login com:
   - Email: `teste.automatizado@ifarma.com`
   - Senha: `Teste123!@#`
3. Verifique que consegue acessar o dashboard merchant

### 4. Testar Cadastro de Produto
1. Acesse: `Produtos → Novo Produto`
2. Preencha:
   - Nome: `Dipirona Teste`
   - Preço: `10.00`
   - Estoque: `50`
3. Clique em **SALVAR PRODUTO**
4. Verifique que **NÃO** aparece erro de farmácia

---

## 🐛 TROUBLESHOOTING

### Erro: "non-2xx status code"

#### Causa Provável:
A Edge Function está retornando erro de autenticação ou validação.

#### Solução:

**1. Verificar Logs da Edge Function:**
- Acesse: `https://supabase.com/dashboard/project/gtjhpkakousmdrzjpdat/functions/create-user-admin/logs`
- Procure pelo erro mais recente
- Anote a mensagem de erro

**2. Erros Comuns e Soluções:**

| Erro no Log | Causa | Solução |
|-------------|-------|---------|
| "Invalid requester token" | Token de autenticação inválido | Recarregue a página e tente novamente |
| "Could not verify requester profile" | Perfil do admin não encontrado | Verifique se está logado como admin |
| "Unauthorized" | Permissões insuficientes | Verifique se o usuário logado é admin |
| "User already exists" | Email já cadastrado | Use outro email ou delete o usuário existente |

**3. Se o erro persistir:**

Execute este script no console do navegador (F12):
```javascript
const { data: { session } } = await supabase.auth.getSession();
console.log('Session:', session);
console.log('User:', session?.user);
console.log('Token:', session?.access_token?.substring(0, 20) + '...');
```

Verifique se:
- `session` não é null
- `session.user` existe
- `session.access_token` existe

---

## 📋 MÉTODO 2: Via SQL + Console (ALTERNATIVO)

Se a interface web não funcionar, use este método:

### Passo 1: Criar Farmácia via SQL
Execute no Supabase SQL Editor o arquivo: `CRIAR_FARMACIA_TESTE.sql`

### Passo 2: Copiar ID da Farmácia
Copie o `id` retornado pela query.

### Passo 3: Criar Usuário via Console
1. Abra o console do navegador (F12) em qualquer página do sistema
2. Execute:
```javascript
const { data: { session } } = await supabase.auth.getSession();

const { data, error } = await supabase.functions.invoke('create-user-admin', {
    body: {
        email: 'teste.automatizado@ifarma.com',
        password: 'Teste123!@#',
        auth_token: session.access_token,
        pharmacy_id: 'COLE_O_ID_AQUI', // Substituir pelo ID copiado
        metadata: {
            full_name: 'Gestor Teste',
            role: 'merchant',
            pharmacy_id: 'COLE_O_ID_AQUI', // Substituir pelo ID copiado
            phone: '(11) 98765-4321'
        }
    }
});

console.log('Resultado:', data);
console.log('Erro:', error);
```

### Passo 4: Verificar Resultado
- Se `data.user` existe → Sucesso!
- Se `error` existe → Veja a mensagem de erro

---

## 📊 CHECKLIST DE VALIDAÇÃO

Após criar a farmácia, marque cada item:

- [ ] Farmácia aparece na lista de farmácias
- [ ] Farmácia tem status "Aprovado"
- [ ] Perfil merchant foi criado
- [ ] Perfil tem `pharmacy_id` vinculado
- [ ] Login com credenciais funciona
- [ ] Dashboard merchant carrega corretamente
- [ ] Cadastro de produto funciona sem erros

---

## 🎯 CREDENCIAIS DA FARMÁCIA TESTE

**Farmácia:**
- Nome: Farmácia Teste Automatizada
- CNPJ: 12.345.678/0001-99
- Endereço: Av. Paulista, 1578 - Bela Vista, São Paulo - SP

**Acesso:**
- Email: `teste.automatizado@ifarma.com`
- Senha: `Teste123!@#`
- Perfil: Merchant (Gestor)

---

**Boa sorte! 🚀**
