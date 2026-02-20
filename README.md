# <p align="center">💊 Ifarma - Ecossistema Digital de Saúde</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-2.1.0-emerald?style=for-the-badge" alt="Version">
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React">
  <img src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase">
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind">
</p>

---

## 🚀 Sobre o Projeto

O **Ifarma** é uma infraestrutura digital completa para o setor farmacêutico. Mais do que um simples delivery, é um ecossistema que conecta farmácias, profissionais de saúde, entregadores e pacientes em uma rede inteligente de cuidados.

Nossa missão é transformar a farmácia local em um hub digital, garantindo que medicamentos cheguem a quem precisa com segurança, rastreabilidade e agilidade extrema.

---

## 📱 Experiências Dedicadas

O ecossistema Ifarma foi desenhado com nichos de usuários específicos em mente:

### 👤 **Para o Paciente (App Cliente)**
*   **Busca Inteligente:** Encontre medicamentos por nome, marca ou sintoma.
*   **Receita Digital:** Upload e validação de prescrições médicas em tempo real.
*   **Acompanhamento Live:** Rastreio do entregador no mapa via Google Maps API.
*   **Chat Direto:** Canal de comunicação com o farmacêutico responsável.

### 🏢 **Para a Farmácia (Painel Lojista)**
*   **Gestão de Inventário:** Controle simplificado de estoque e preços.
*   **Dashboard Financeiro:** Métricas de vendas, ticket médio e lucratividade.
*   **Billing Automatizado:** Sistema de mensalidade via PIX e cobranças recorrentes.
*   **Gestão de Frota:** Controle de motoboys próprios ou terceirizados.

### 🛵 **Para o Entregador (App Motoboy)**
*   **Roteirização:** Caminhos otimizados para múltiplas entregas.
*   **Carteira Digital:** Extrato diário de ganhos e quilometragem.
*   **Comprovante Digital:** Captura de foto e assinatura na entrega.

---

## 🛠️ Stack Tecnológica Moderníssima

| Camada | Tecnologia |
| :--- | :--- |
| **Frontend Core** | React 18+ & TypeScript |
| **Mobile Foundation** | Capacitor.js (iOS & Android) |
| **Infraestrutura Cloud** | Supabase (Postgres & Edge Functions) |
| **Estilização** | Tailwind CSS v4 & Maestro Design Standards |
| **Real-time** | Websockets via Supabase Realtime |
| **Maps & Geo** | Google Maps SDK & PostGIS |

---

## 🏃 Começando (Quick Start)

Para rodar o ambiente de desenvolvimento localmente:

1. **Clone & Install**
   ```bash
   git clone https://github.com/vinnicirne/ifarma.git
   npm install
   ```

2. **Variaveis de Ambiente**
   Configure o arquivo `.env` com suas credenciais:
   ```env
   VITE_SUPABASE_URL=sua_url
   VITE_SUPABASE_ANON_KEY=sua_key
   VITE_GOOGLE_MAPS_KEY=sua_key
   ```

3. **Inicie o Motor**
   ```bash
   npm run dev
   ```

---

## 💎 Qualidade e Engenharia de Software

O Ifarma utiliza um pipeline de qualidade rigoroso para garantir disponibilidade de 99.9%:

*   ⚡ **Master Checklist:** `python .agent/scripts/checklist.py .` (Auditoria completa 360°)
*   🎨 **UX Audit:** Verificação automática contra as regras de cor e acessibilidade Maestro.
*   🧪 **Test Suite:** Cobertura de testes unitários e integração via Vitest.
*   🔍 **SEO Engine:** Otimização para mecanismos de busca e compartilhamento social.

---

## 📄 Documentação e Recursos

Acesse nossos guias detalhados:

*   📖 [Guia da API para Desenvolvedores](./docs/API.md)
*   🗄️ [Histórico de Engenharia e PRDs](./docs/archive/)
*   💾 [Banco de Dados (Migrations)](./supabase/migrations/)

---

<p align="center">
  Desenvolvido com ❤️ pela equipe Ifarma.<br>
  Copyright © 2026 Ifarma. Todos os direitos reservados.
</p>
