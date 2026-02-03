# Script de limpeza e organização SQL
# Ifarma Project Cleanup

Write-Host "🧹 Iniciando limpeza de arquivos SQL..." -ForegroundColor Green

# Mover RLS fixes para migrations
$rlsFixes = @(
    "fix_address_rls.sql",
    "fix_chat_rls.sql",
    "fix_merchant_rls.sql",
    "fix_order_items_rls.sql",
    "fix_products_rls.sql",
    "fix_profiles_rls.sql",
    "fix_cancellation_rls.sql",
    "fix_pharmacy_policy.sql",
    "fix_pharmacy_select_policy.sql"
)

$counter = 9
foreach ($file in $rlsFixes) {
    if (Test-Path $file) {
        $newName = "supabase\migrations\{0:D3}_$file" -f $counter
        Move-Item $file $newName -ErrorAction SilentlyContinue
        Write-Host "✓ Movido: $file -> $newName" -ForegroundColor Cyan
        $counter++
    }
}

# Mover outros fixes importantes para migrations
$importantFixes = @(
    "fix_notifications_schema.sql",
    "fix_chat_complete.sql",
    "fix_address_system_complete.sql",
    "fix_map_permissions.sql",
    "fix_pharmacy_coords.sql"
)

foreach ($file in $importantFixes) {
    if (Test-Path $file) {
        $newName = "supabase\migrations\{0:D3}_$file" -f $counter
        Move-Item $file $newName -ErrorAction SilentlyContinue
        Write-Host "✓ Movido: $file -> $newName" -ForegroundColor Cyan
        $counter++
    }
}

# Mover versões antigas para archive
$oldVersions = @(
    "fix_realtime_v2.sql",
    "fix_realtime_v3.sql",
    "atualizacao_geral_v2.sql",
    "atualizacao_final_v3.sql",
    "update_database_v3.sql",
    "update_schema_v3.sql",
    "fix_motoboy_schema.sql"
)

foreach ($file in $oldVersions) {
    if (Test-Path $file) {
        Move-Item $file "supabase\archive\old_fixes\$file" -ErrorAction SilentlyContinue
        Write-Host "📦 Arquivado: $file" -ForegroundColor Yellow
    }
}

# Mover mais diagnósticos
$diagnostics = @(
    "verify_merchant_user.sql",
    "verify_motoboy_rls.sql"
)

foreach ($file in $diagnostics) {
    if (Test-Path $file) {
        Move-Item $file "supabase\archive\diagnostics\$file" -ErrorAction SilentlyContinue
        Write-Host "📦 Arquivado: $file (diagnóstico)" -ForegroundColor Yellow
    }
}

# Seeds adicionais
$seeds = @(
    "set_comercial_admin.sql",
    "setup_admin.sql",
    "restaurar_admin_vinicius.sql",
    "restore_admin.sql",
    "create_product_catalog.sql"
)

foreach ($file in $seeds) {
    if (Test-Path $file) {
        Move-Item $file "supabase\seeds\dev\$file" -ErrorAction SilentlyContinue
        Write-Host "🌱 Movido para seeds: $file" -ForegroundColor Green
    }
}

# Deletar arquivo vazio
if (Test-Path "recreate_schema_v_final.sql") {
    Remove-Item "recreate_schema_v_final.sql" -ErrorAction SilentlyContinue
    Write-Host "🗑️  Deletado: recreate_schema_v_final.sql (arquivo vazio)" -ForegroundColor Red
}

# Deletar teste temporário
if (Test-Path "disable_rls_test.sql") {
    Remove-Item "disable_rls_test.sql" -ErrorAction SilentlyContinue
    Write-Host "🗑️  Deletado: disable_rls_test.sql (teste temporário)" -ForegroundColor Red
}

Write-Host "`n✅ Limpeza concluída!" -ForegroundColor Green
Write-Host "📊 Verificando resultado..." -ForegroundColor Cyan

# Contar arquivos SQL restantes no root
$remainingSql = (Get-ChildItem -Path . -Filter "*.sql" -File).Count
Write-Host "`nArquivos SQL restantes no root: $remainingSql" -ForegroundColor $(if ($remainingSql -le 5) { "Green" } else { "Yellow" })

# Mostrar estrutura
Write-Host "`n📁 Estrutura organizada:" -ForegroundColor Cyan
Write-Host "   supabase/migrations/: $((Get-ChildItem -Path supabase\migrations -Filter "*.sql").Count) arquivos"
Write-Host "   supabase/seeds/dev/: $((Get-ChildItem -Path supabase\seeds\dev -Filter "*.sql").Count) arquivos"
Write-Host "   supabase/archive/old_fixes/: $((Get-ChildItem -Path supabase\archive\old_fixes -Filter "*.sql").Count) arquivos"
Write-Host "   supabase/archive/diagnostics/: $((Get-ChildItem -Path supabase\archive\diagnostics -Filter "*.sql").Count) arquivos"
