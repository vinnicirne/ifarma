#!/bin/bash

# Deploy de Edge Functions para Supabase
# Uso: ./DEPLOY_EDGE_FUNCTIONS.sh

echo "🚀 Iniciando deploy das Edge Functions..."

# Verificar se o Supabase CLI está instalado
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI não encontrado. Instale com:"
    echo "npm install -g supabase"
    exit 1
fi

# Verificar se está logado
echo "📋 Verificando login..."
supabase projects list

# Lista de funções para fazer deploy (as principais que foram modificadas)
FUNCTIONS=(
    "activate-pharmacy-plan"
    "get-pix-qrcode"
    "create-staff-user"
    "create-team-member"
    "billing-create-subscription"
    "billing-cycle-close"
    "check-asaas-payment"
    "provision-merchant-access"
    "reset-billing-cycles"
    "send-push-notification"
    "motoboy-notifier"
    "order-notifier"
    "asaas-webhook"
    "asaas-proxy"
)

# Deploy de cada função
for func in "${FUNCTIONS[@]}"; do
    echo ""
    echo "📦 Fazendo deploy da função: $func"
    
    if [ -d "supabase/functions/$func" ]; then
        supabase functions deploy $func --no-verify-jwt
        if [ $? -eq 0 ]; then
            echo "✅ $func deployado com sucesso!"
        else
            echo "❌ Erro no deploy de $func"
        fi
    else
        echo "⚠️ Diretório $func não encontrado, pulando..."
    fi
done

echo ""
echo "🎉 Deploy das Edge Functions concluído!"
echo ""
echo "📊 Verifique o status em:"
echo "https://supabase.com/dashboard/project/gtjhpkakousmdrzjpdat/functions"
