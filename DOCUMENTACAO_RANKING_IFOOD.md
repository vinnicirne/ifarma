# 🧠 Novo Algoritmo de Ranqueamento Inteligente (Estilo iFood)

Implementei um sistema de pontuação dinâmica que reordena as farmácias com base em múltiplos fatores, não apenas distância.

## 📊 A Fórmula de Score

A pontuação de cada farmácia é calculada em tempo real no frontend (`App.tsx`), personalizada para a localização do usuário:

```typescript
FinalScore = 
  (Proximidade * 0.35) +  // Peso 35%: Mais perto = Mais pontos
  (TempoEntrega * 0.25) + // Peso 25%: Mais rápido = Mais pontos
  (SLA * 0.20) +          // Peso 20%: Performance (Cancelamentos/Atrasos)
  (Avaliação * 0.15) +    // Peso 15%: Notas 0-5 estrelas
  (Promoção * 0.05)       // Peso 5%: Planos Premium/Destaques
```

## 🚀 Fatores de Boost (Fura-Fila)

Além da pontuação base, aplicamos boosts imediatos:

1.  **Status Aberto/Fechado:**
    *   **Aberto:** +2000 pontos (Sempre no topo da lista)
    *   **Fechado:** -2000 pontos (Sempre no final da lista)

2.  **Patrocínio (Ads):**
    *   **Patrocinado:** +500 pontos (Sobe posições acima dos orgânicos similares)

3.  **Novidade:**
    *   **Loja Nova (<90 dias):** +50 pontos (Pequeno empurrão de visibilidade)

## ✅ Como Ativar (Banco de Dados)

Para que o algoritmo funcione com todo o potencial (usando SLA e Tempos reais), você precisa rodar o script SQL que cria as novas colunas no banco.

1.  Acesse o **Supabase SQL Editor**.
2.  Execute o script: **`ADD_RANKING_COLUMNS.sql`** (criado na sua área de trabalho).

### Colunas Adicionadas:
*   `sla_score` (0-100): Score de performance operacional.
*   `delivery_time_min` (min): Tempo mínimo de entrega.
*   `delivery_time_max` (min): Tempo máximo de entrega.
*   `is_sponsored` (boolean): Flag para lojas que pagaram por destaque (Ads).

---

## 🧪 Como Testar

1.  No banco, pegue uma farmácia e altere o `sla_score` para `50`. Ela deve cair no ranking.
2.  Marque uma farmácia como `is_sponsored = true`. Ela deve subir, mesmo estando um pouco mais longe.
3.  Altere o `latitude`/`longitude` para ficar bem perto. Ela deve disparar para o topo.
