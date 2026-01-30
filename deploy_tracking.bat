@echo off
echo ===================================================
echo   Implmentação Corretiva da Tracking Engine
echo ===================================================
echo.
echo Este script ajuda a implantar a função tracking-engine atualizada.
echo Certifique-se de estar logado no Supabase CLI antes de continuar.
echo.

cd /d "C:\Users\THINKPAD\Desktop\Ifarma"

echo 1. Verificando login...
call npx supabase projects list
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [!] Parece que você não está logado.
    echo Por favor, execute 'npx supabase login' e tente novamente.
    pause
    exit /b
)

echo.
echo 2. Implantando tracking-engine COM flag --no-verify-jwt...
echo    Isso permite que a função receba a requisição mesmo se o Gateway do Supabase
echo    estiver rejeitando o token (erro 401).
echo.
echo ⚠️  ATENÇÃO: Se pedir para atualizar segredos, confirme.
echo.

call npx supabase functions deploy tracking-engine --no-verify-jwt

echo.
echo ===================================================
echo   Concluído!
echo   Teste o app novamente. O erro 401 deve sumir.
echo ===================================================
pause
