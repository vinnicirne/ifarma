# Documentação do Módulo: Gestão de Motoboys

## Objetivo
Gerenciar o ciclo de vida dos entregadores (motoboys), desde o cadastro e vínculo com farmácias até a definição de contratos e pagamentos.

## Usuários
- **Administrador**: Cadastro global e banimento de motoboys.
- **Logística**: Vinculação de entregadores a pontos de venda (farmácias).

## Telas e Componentes
- **MotoboyManagement.tsx**: Dashboard de gestão de entregadores.
- **ContractModal**: Definição de taxas de entrega, diárias e bônus.
- **AssignPharmacyModal**: Troca de farmácia operacional do motoboy.

## Dependências
- `create-user-admin` (Edge Function): Criação de credenciais de acesso no Supabase Auth.
- `courier_contracts` (Tabela): Armazena regras financeiras individuais.

## Fluxo de Uso
1. Clique em **Cadastrar Motoboy**.
2. Insira dados básicos, incluindo telefone (que servirá como login).
3. Defina a senha inicial.
4. O sistema cria automaticamente o usuário no Auth e o perfil na tabela `profiles`.
5. Abra o modal de **Contrato** para definir as taxas de repasse.

## Checklist de Qualidade
- [x] Validação de CPF/Telefone.
- [x] Integração com Supabase Auth via Edge Function.
- [x] Persistência de contratos financeiros.
- [x] Bloqueio/Desbloqueio de acesso instantâneo.

## Histórico de Logs/Ações
- Adicionada funcionalidade de "Contrato Admin" para definição de bônus de produtividade.

## Recomendações
- Implementar upload de CNH em bucket S3/Supabase Storage.
- Adicionar histórico de repasses semanais.
