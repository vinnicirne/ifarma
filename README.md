# 💊 Ifarma - A Sua Saúde na Palma da Mão

Ifarma é uma plataforma completa de delivery de medicamentos e produtos de saúde, conectando farmácias locais, entregadores (motoboys) e clientes finais em uma experiência rápida, segura e intuitiva.

## 🚀 O que é o Ifarma?

O Ifarma não é apenas um app de delivery; é uma infraestrutura digital para o setor farmacêutico. Nosso ecossistema permite que farmácias de qualquer tamanho entrem no mundo digital com ferramentas robustas de gestão, enquanto oferece aos usuários a conveniência de receber seus remédios em minutos.

### 👥 Quem usa o Ifarma?

1.  **Clientes (Pacientes):** Compram medicamentos, enviam receitas médicas digitalmente, acompanham o pedido em tempo real e conversam com o farmacêutico via chat.
2.  **Farmácias (Parceiros):** Gerenciam estoque, processam pedidos, configuram automações de chat e visualizam métricas financeiras em um dashboard dedicado.
3.  **Motoboys (Entregadores):** Recebem chamadas de entrega, utilizam GPS integrado para rotas otimizadas e gerenciam seus ganhos diários.
4.  **Administradores:** Controlam a aprovação de novos parceiros, gerenciam anúncios e configuram parâmetros globais do sistema.

## ✨ Benefícios Principais

*   **Para o Usuário:** Agilidade na entrega, acesso a farmácias próximas com melhores preços e segurança no manuseio de receitas.
*   **Para a Farmácia:** Aumento nas vendas, digitalização do atendimento e logística de entrega simplificada.
*   **Para o Motoboy:** Fluxo constante de entregas e interface focada em produtividade.

---

## 🛠️ Stack Tecnológica

*   **Frontend:** React 18 + TypeScript + Vite.
*   **Mobile:** Capacitor (Transforma a Web App em Apps Nativos iOS/Android).
*   **Backend & DB:** Supabase (PostgreSQL, Realtime, Auth, Edge Functions & Storage).
*   **Estilização:** CSS Moderno / TailwindCSS.
*   **Geolocalização:** Google Maps API & Capacitor Geolocation.
*   **Monitoramento:** Rollbar para rastreamento de erros em produção.

---

## 🏃 Como Rodar o Projeto

1.  **Clone o repositório:**
    ```bash
    git clone https://github.com/vinnicirne/ifarma.git
    cd ifarma
    ```
2.  **Instale as dependências:**
    ```bash
    npm install
    ```
3.  **Configure o Ambiente:**
    Crie um arquivo `.env` baseado no `.env.example` com suas chaves do Supabase e Google Maps.
4.  **Inicie o servidor de desenvolvimento:**
    ```bash
    npm run dev
    ```

---

## 📄 Documentação Adicional

*   [Guia da API para Desenvolvedores](./API.md) - Endpoints e integração.
*   [Setup de Notificações Push](./NOTIFICACOES_PUSH_SETUP.md) - Configuração do Firebase/Capacitor.
*   [Manual do Gestor Farmacêutico](./INSTRUCOES_LOGIN_FARMACIA.txt) - Como usar o painel lojista.

---

## 🛡️ Licença

Copyright © 2026 Ifarma. Todos os direitos reservados.
