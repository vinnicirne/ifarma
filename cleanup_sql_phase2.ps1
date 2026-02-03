# Script de limpeza COMPLETA - Fase 2
# Move TODOS os arquivos SQL restantes

Write-Host "🧹 Fase 2: Limpeza completa dos arquivos SQL restantes..." -ForegroundColor Green

# Mover TODOS os fix_*.sql remaining para migrations
$allRemainingFixes = Get-ChildItem -Filter "fix_*.sql" -File
$counter = 18

foreach ($file in $allRemainingFixes) {
    $newName = "supabase\migrations\{0:D3}_$($file.Name)" -f $counter
    Move-Item $file.Name $newName -ErrorAction SilentlyContinue
    Write-Host "✓ Movido: $($file.Name) -> $newName" -ForegroundColor Cyan
    $counter++
}

# Mover updates para migrations
$updates = Get-ChildItem -Filter "update_*.sql" -File
foreach ($file in $updates) {
    $newName = "supabase\migrations\{0:D3}_$($file.Name)" -f $counter
    Move-Item $file.Name $newName -ErrorAction SilentlyContinue
    Write-Host "✓ Movido: $($file.Name) -> $newName" -ForegroundColor Cyan
    $counter++
}

# Arquivar ferramentas específicas
$tools = @(
    "link_merchant.sql",
    "whatsapp_api_setup.sql",
    "enable_realtime_orders.sql",
    "elite_2_0_telemetry.sql"
)

foreach ($file in $tools) {
    if (Test-Path $file) {
        Move-Item $file "supabase\archive\old_fixes\$file" -ErrorAction SilentlyContinue
        Write-Host "📦 Arquivado (tool): $file" -ForegroundColor Yellow
    }
}

# Mover diagnósticos remaining
$diagFiles = Get-ChildItem -Filter "verify_*.sql" -File
foreach ($file in $diagFiles) {
    Move-Item $file.Name "supabase\archive\diagnostics\$($file.Name)" -ErrorAction SilentlyContinue
    Write-Host "📦 Arquivado (diag): $($file.Name)" -ForegroundColor Yellow
}

# Arquivar fixes em maiúsculas obsoletos
if (Test-Path "FIX_SUPABASE_RLS.sql") {
    Move-Item "FIX_SUPABASE_RLS.sql" "supabase\archive\old_fixes\FIX_SUPABASE_RLS.sql" -ErrorAction SilentlyContinue
    Write-Host "📦 Arquivado: FIX_SUPABASE_RLS.sql (replaced by specific RLS fixes)" -ForegroundColor Yellow
}

if (Test-Path "SUPER_FIX_PEDIDOS.sql") {
    Move-Item "SUPER_FIX_PEDIDOS.sql" "supabase\archive\old_fixes\SUPER_FIX_PEDIDOS.sql" -ErrorAction SilentlyContinue
    Write-Host "📦 Arquivado: SUPER_FIX_PEDIDOS.sql" -ForegroundColor Yellow
}

Write-Host "`n✅ Fase 2 concluída!" -ForegroundColor Green

# Contar resultado final
$remainingSql = (Get-ChildItem -Path . -Filter "*.sql" -File).Count
Write-Host "`nArquivos SQL restantes no root: $remainingSql" -ForegroundColor $(if ($remainingSql -le 3) { "Green" } else { "Yellow" })

Write-Host "`n📁 Estrutura final:" -ForegroundColor Cyan
Write-Host "   supabase/migrations/: $((Get-ChildItem -Path supabase\migrations -Filter "*.sql").Count) arquivos"
Write-Host "   supabase/seeds/dev/: $((Get-ChildItem -Path supabase\seeds\dev -Filter "*.sql").Count) arquivos"
Write-Host "   supabase/archive/old_fixes/: $((Get-ChildItem -Path supabase\archive\old_fixes -Filter "*.sql").Count) arquivos"
Write-Host "   supabase/archive/diagnostics/: $((Get-ChildItem -Path supabase\archive\diagnostics -Filter "*.sql").Count) arquivos"

# Listar arquivos que DEVEM permanecer no root
Write-Host "`n📌 Arquivos mantidos no root (essenciais):" -ForegroundColor Green
Get-ChildItem -Filter "*.sql" -File | ForEach-Object { Write-Host "   - $($_.Name)" -ForegroundColor White }
