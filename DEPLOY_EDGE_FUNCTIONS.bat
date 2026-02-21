@echo off
REM Deploy de Edge Functions para Supabase (Windows)
REM Uso: DEPLOY_EDGE_FUNCTIONS.bat

echo 🚀 Iniciando deploy das Edge Functions...

REM Verificar se o Supabase CLI está instalado
where supabase >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Supabase CLI não encontrado. Instale com:
    echo npm install -g supabase
    pause
    exit /b 1
)

REM Verificar se está logado
echo 📋 Verificando login...
supabase projects list

REM Lista de funções para fazer deploy
set FUNCTIONS=activate-pharmacy-plan get-pix-qrcode create-staff-user create-team-member billing-create-subscription billing-cycle-close check-asaas-payment provision-merchant-access reset-billing-cycles send-push-notification motoboy-notifier order-notifier asaas-webhook asaas-proxy

REM Deploy de cada função
for %%f in (%FUNCTIONS%) do (
    echo.
    echo 📦 Fazendo deploy da função: %%f
    
    if exist "supabase\functions\%%f" (
        supabase functions deploy %%f --no-verify-jwt
        if !errorlevel! equ 0 (
            echo ✅ %%f deployado com sucesso!
        ) else (
            echo ❌ Erro no deploy de %%f
        )
    ) else (
        echo ⚠️ Diretório %%f não encontrado, pulando...
    )
)

echo.
echo 🎉 Deploy das Edge Functions concluído!
echo.
echo 📊 Verifique o status em:
echo https://supabase.com/dashboard/project/gtjhpkakousmdrzjpdat/functions

pause
