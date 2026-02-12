# Algoritmo de Publicidade e Destaques - Ifarma

Este documento descreve o funcionamento técnico e a lógica por trás do sistema de anúncios e destaques do aplicativo Ifarma. O sistema foi projetado para equilibrar a visibilidade de parceiros pagantes com a relevância para o usuário final.

---

## 1. Lojas Patrocinadas (`FeaturedPharmacies`)

Esta seção é a vitrine principal para farmácias que desejam maior visibilidade na Home.

### Como o Algoritmo age:
- **Seleção Primária**: O sistema filtra todas as farmácias onde a flag `is_featured` está marcada como **true** no banco de dados.
- **Limite**: São exibidas até 10 lojas patrocinadas por vez.
- **Transparência**: Conforme as normas de publicidade digital, estas lojas recebem o rótulo **"PATROCINADO"** com a legenda "Lojas em destaque por publicidade".
- **Sistema de Fallback**: Caso não existam anunciantes ativos no momento, o algoritmo não deixa a seção vazia. Ele automaticamente seleciona as **5 farmácias com melhor ranking/score** na região do usuário para manter o engajamento.

---

## 2. Mais Vendidos e Produtos em Alta (`SpecialHighlights`)

Esta seção foca em produtos específicos e ofertas, agindo como um motor de conversão.

### Como o Algoritmo age:
- **Critérios de Entrada**: Entram nesta lista produtos que atendem a pelo menos um dos requisitos abaixo:
    1. **Promoção Ativa**: Possuem um `promotional_price` definido (isso prioriza economia para o usuário).
    2. **Planos Premium**: Pertencem a farmácias com planos **Premium** ou **Pro**.
- **Algoritmo de Justiça (Randomização)**: Para garantir que todos os anunciantes tenham a mesma oportunidade de visualização, a lista é **randomizada (`Math.random()`)** a cada carregamento de página. Isso evita que o mesmo produto fique sempre "preso" na primeira posição.
- **Fallback Geográfico**: Se não houver produtos patrocinados ou em promoção, o sistema busca automaticamente os produtos das **3 farmácias mais próximas** do usuário.

---

## 3. Categorias e Feed Geral

A ordem das farmácias no feed geral ("Farmácias Próximas") segue uma hierarquia de utilidade:

1. **Status de Funcionamento**: Lojas abertas sempre aparecem antes de lojas fechadas.
2. **Geolocalização**: Entre lojas com o mesmo status, a mais próxima (em km) tem prioridade.
3. **Relevância (Ranking)**: Lojas com melhores avaliações dos usuários ganham posições superiores no desempate.

---

## 4. Glossário de Atributos

| Atributo | Significado | Impacto no Algoritmo |
| :--- | :--- | :--- |
| `is_featured` | Booleano (Sim/Não) | Define se a loja aparece na seção de patrocinados superior. |
| `plan` | Nível de Assinatura | Planos 'Premium' e 'Pro' garantem destaque automático de produtos. |
| `promotional_price` | Preço de Oferta | Produtos em promoção ganham prioridade de exibição e rótulos de desconto. |
| `rating` | Avaliação (0-5) | Usado como critério de desempate e confiança para o usuário. |

---

> **Nota de Integridade**: O algoritmo prioriza o faturamento da plataforma (anúncios), mas sempre garante a funcionalidade básica através dos fallbacks, assegurando que o usuário nunca encontre uma interface vazia, independentemente da quantidade de anunciantes ativos.
