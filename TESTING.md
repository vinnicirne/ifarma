# 🧪 Testes - Ifarma

Este documento explica como executar e criar testes no projeto Ifarma.

---

## 📊 Status Atual

- **Framework:** Vitest + React Testing Library
- **Testes criados:** 14
- **Testes passando:** 11 ✅
- **Coverage:** Em implementação

---

## 🚀 Executar Testes

### Modo Watch (Desenvolvimento)
```bash
npm test
# ou
npm run test
```

### Executar Uma Vez
```bash
npm run test:run
```

### Com Interface UI
```bash
npm run test:ui
```

### Com Cobertura
```bash
npm run test:coverage
```

---

## 📁 Estrutura

```
src/
├── hooks/
│   ├── useAuth.ts
│   ├── useAuth.test.ts      ← 5 testes
│   ├── useCart.ts
│   └── useCart.test.ts      ← 9 testes
│
└── test/
    └── setup.ts              ← Configuração global
```

---

## ✅ Testes Existentes

### `useAuth` Hook (5 testes)
- ✅ Deve iniciar com loading = true
- ✅ Deve retornar session null quando não há usuário logado  
- ✅ Deve buscar perfil quando há sessão
- ⚠️ Deve tratar erro ao buscar perfil (erro de mensagem)
- ✅ Deve limpar subscription ao desmontar

### `useCart` Hook (9 testes)
- ✅ Deve iniciar com carrinho vazio
- ⚠️ Deve buscar itens do carrinho ao montar (mock issue)
- ⚠️ Deve calcular total corretamente (mock issue)
- ✅ Deve adicionar item ao carrinho
- ✅ Deve lançar erro ao adicionar sem autenticação
- ✅ Deve atualizar quantidade de item
- ✅ Deve remover item quando quantidade for 0
- ✅ Deve remover item do carrinho
- ✅ Deve limpar carrinho completo

---

## 🔧 Configuração

### `vitest.config.ts`
- ✅ React plugin configurado
- ✅ jsdom environment
- ✅ Globals habilitados
- ✅ Coverage com v8

### `src/test/setup.ts`
- ✅ Mocks do Supabase
- ✅ Mock de window.matchMedia
- ✅ Mock de IntersectionObserver
- ✅ Mock de ResizeObserver
- ✅ Cleanup automático após cada teste

---

## ✍️ Como Criar Novos Testes

### 1. Criar arquivo de teste
```bash
# Padrão: [nome-do-arquivo].test.ts
src/hooks/useNotifications.test.ts
```

### 2. Template básico
```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useNotifications } from './useNotifications';
import { supabase } from '../lib/supabase';

vi.mock('../lib/supabase');

describe('useNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve buscar notificações', async () => {
    // Arrange
    const mock = vi.fn().mockResolvedValue({ data: [], error: null });
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: mock
    } as any);

    // Act
    const { result } = renderHook(() => useNotifications());
    
    // Assert
    await waitFor(() => {
      expect(result.current.notifications).toEqual([]);
    });
  });
});
```

---

## 📈 Próximos Passos

### Testes Prioritários
1. `useNotifications` hook
2. `useGeolocation` hook  
3. `supabase.ts` client
4. Componentes críticos (Auth, Checkout)

### Melhorias
1. Aumentar coverage para 80%+
2. Adicionar testes E2E com Playwright
3. Adicionar testes de componentes visuais
4. Configurar CI/CD para rodar testes automaticamente

---

## 🐛 Troubleshooting

### Erro: "Cannot find module"
- Verificar path de import
- Usar imports relativos corretos (`./` ou `../`)

### Testes não atualizam automaticamente
- Usar `npm test` (modo watch)
- Verificar se arquivos terminam com `.test.ts`

### Mocks não funcionam
- Verificar se `vi.mock()` está antes dos imports
- Limpar mocks com `vi.clearAllMocks()` no `beforeEach`

---

**Última atualização:** 03/02/2026  
**Mantido por:** Equipe Ifarma
