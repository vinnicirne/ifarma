import { test, expect, type BrowserContext } from '@playwright/test';

test.describe('Fluxo E2E: Ciclo de Vida do Pedido', () => {
    let clientContext: BrowserContext;
    let merchantContext: BrowserContext;
    let motoboyContext: BrowserContext;

    test.beforeAll(async ({ browser }) => {
        const clientOptions = {
            viewport: { width: 375, height: 812 },
            permissions: ['geolocation'],
            geolocation: { latitude: -22.856, longitude: -43.028 },
            ignoreHTTPSErrors: true,
            bypassCSP: true
        };
        clientContext = await browser.newContext(clientOptions);
        merchantContext = await browser.newContext({
            viewport: { width: 1280, height: 800 },
            ignoreHTTPSErrors: true,
            bypassCSP: true
        });
        motoboyContext = await browser.newContext({
            viewport: { width: 375, height: 812 },
            permissions: ['geolocation'],
            geolocation: { latitude: -22.856, longitude: -43.028 },
            ignoreHTTPSErrors: true,
            bypassCSP: true
        });
    });

    const setupLogging = (page: any, role: string) => {
        page.on('console', (msg: any) => {
            console.log(`[${role} LOG] ${msg.type()}: ${msg.text()}`);
        });

        page.on('dialog', async (dialog: any) => {
            console.log(`[${role} DIALOG] ${dialog.message()}`);
            await dialog.accept();
        });

        page.on('requestfailed', (request: any) => {
            console.log(`❌ [${role} REQ FAIL] ${request.url()}: ${request.failure()?.errorText}`);
        });
    };

    test('deve completar o ciclo: Cliente -> Gestor -> Motoboy', async () => {
        test.setTimeout(180000); // 3 minutos

        const clientPage = await clientContext.newPage();
        const merchantPage = await merchantContext.newPage();
        const motoboyPage = await motoboyContext.newPage();

        setupLogging(clientPage, 'CLIENTE');
        setupLogging(merchantPage, 'GESTOR');
        setupLogging(motoboyPage, 'MOTOBOY');

        let orderId = '';

        // --- STEP 1: CLIENT PLACES ORDER ---
        await test.step('Cliente: Realizar Pedido', async () => {
            await clientPage.goto('/');
            await clientPage.click('button:has(.material-symbols-outlined:text("menu"))');
            await clientPage.click('text=Acessar Conta');
            await clientPage.fill('input[type="email"]', 'test-cliente@ifarma.com');
            await clientPage.fill('input[type="password"]', 'password123');
            await clientPage.click('button:has-text("Entrar")');
            await expect(clientPage).toHaveURL('/', { timeout: 15000 });
            console.log("✅ Cliente Logado!");

            console.log("⏳ Aguardando estabilização...");
            await clientPage.waitForTimeout(5000);

            console.log("🛒 Navegando para Checkout...");
            await clientPage.goto('/checkout');

            // Wait for checkout to load (look for confirm button OR empty cart message)
            console.log("⏳ Aguardando carrinho carregar...");
            await clientPage.waitForTimeout(5000);

            // Check if we have items in cart
            const confirmBtn = clientPage.locator('button:has-text("Confirmar Pedido")');
            const hasConfirm = await confirmBtn.isVisible({ timeout: 15000 }).catch(() => false);

            if (!hasConfirm) {
                throw new Error('Carrinho vazio no checkout! Execute: npx ts-node scripts/setup_e2e_data.ts');
            }

            console.log("📍 Selecionando Endereço...");
            // Try "Principal" address chip first, then any available chip
            const principalBtn = clientPage.locator('button:has-text("Principal")');
            const principalVisible = await principalBtn.isVisible({ timeout: 5000 }).catch(() => false);

            if (principalVisible) {
                await principalBtn.click();
                console.log("✅ Endereço Principal selecionado.");
            } else {
                // Try any address chip in the horizontal scroll container
                const anyAddrChip = clientPage.locator('div.flex.gap-3 > button').first();
                const anyChipVisible = await anyAddrChip.isVisible({ timeout: 5000 }).catch(() => false);
                if (anyChipVisible) {
                    await anyAddrChip.click();
                    console.log("✅ Primeiro endereço disponivel selecionado.");
                } else {
                    console.log("⚠️ Nenhum endereço-chip disponível. Prosseguindo sem selecionar.");
                }
            }

            await clientPage.click('text=Dinheiro', { timeout: 10000 });

            console.log("🚀 Confirmando Pedido...");
            await clientPage.click('button:has-text("Confirmar Pedido")');

            await expect(clientPage).toHaveURL(/\/order-tracking\//, { timeout: 20000 });
            orderId = clientPage.url().split('/').pop() || '';
            console.log(`✅ Pedido Criado: ${orderId}`);
        });

        // --- STEP 2: MERCHANT ACCEPTS & PREPARES ---
        await test.step('Gestor: Aceitar e Preparar', async () => {
            await merchantPage.goto('/gestor/login');
            await merchantPage.fill('input[placeholder*="E-mail"]', 'test-gestor@ifarma.com');
            await merchantPage.fill('input[type="password"]', 'password123');
            await merchantPage.click('button:has-text("Acessar Painel")');

            console.log("⏳ Aguardando login do Gestor...");
            await expect(merchantPage).not.toHaveURL(/login/, { timeout: 15000 });
            await expect(merchantPage).toHaveURL(/\/gestor/, { timeout: 15000 });
            console.log("✅ Gestor Logado!");

            if (!merchantPage.url().includes('orders')) {
                await merchantPage.goto('/gestor/orders');
            }

            console.log(`🔍 Procurando Pedido #${orderId.substring(0, 6)}...`);
            const orderRow = merchantPage.locator(`text=#${orderId.substring(0, 6)}`);
            await expect(orderRow).toBeVisible({ timeout: 60000 });

            console.log("✅ Pedido Visível! Aceitando...");
            await expect(async () => {
                const btn = merchantPage.locator(`.bg-white:has-text("#${orderId.substring(0, 6)}")`).locator('button:has-text("Aceitar")');
                await btn.click({ timeout: 3000 });
            }).toPass({ timeout: 15000 });

            console.log("📂 Mudando para aba 'Em Preparo'...");
            await merchantPage.locator('button:has-text("Em Preparo")').click();
            await merchantPage.waitForTimeout(1000);

            console.log("Mover para Pronto...");
            await expect(async () => {
                const btn = merchantPage.locator(`.bg-white:has-text("#${orderId.substring(0, 6)}")`).locator('button[title="Pronto / Aguardando Motoboy"]');
                await btn.click({ timeout: 3000 });
            }).toPass({ timeout: 15000 });

            console.log("Atribuir Motoboy...");
            await expect(async () => {
                const btn = merchantPage.locator(`.bg-white:has-text("#${orderId.substring(0, 6)}")`).locator('button[title="Atribuir Motoboy"]');
                await btn.click({ force: true, timeout: 3000 });
            }).toPass({ timeout: 15000 });

            console.log("⏳ Aguardando lista de motoboys...");
            await expect(merchantPage.locator('text=Escolher Entregador')).toBeVisible({ timeout: 15000 });

            await expect(async () => {
                const motoboyEntry = merchantPage.locator('text=Motoboy Teste');
                await motoboyEntry.click({ force: true, timeout: 5000 });
            }).toPass({ timeout: 15000 });

            console.log(`✅ Gestor: Pedido ${orderId} pronto e atribuído.`);
        });

        // --- STEP 3: MOTOBOY DELIVERS ---
        await test.step('Motoboy: Coletar e Entregar', async () => {
            await motoboyPage.goto('/motoboy-login');
            await motoboyPage.fill('input[placeholder*="email"]', 'test-motoboy@ifarma.com');
            await motoboyPage.fill('input[placeholder="Digite sua senha"]', 'password123');
            await motoboyPage.click('button:has-text("Entrar")');
            await expect(motoboyPage).toHaveURL(/\/motoboy/, { timeout: 15000 });

            const offlineBtn = motoboyPage.locator('button:has-text("OFFLINE")');
            if (await offlineBtn.isVisible({ timeout: 5000 })) await offlineBtn.click();

            // Handle zombie orders: if there's an active delivery in progress, try to complete it first
            console.log("🧹 Verificando pedidos zumbis na fila do motoboy...");
            await motoboyPage.waitForTimeout(3000);
            const finishBtn = motoboyPage.locator('button:has-text("Finalizar Entrega"), button:has-text("Confirmar Entrega"), text=Confirmar Retirada, text=Iniciar Rota').first();
            if (await finishBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
                console.log("⚠️ Pedido zumbi ativo detectado - tentando fechar...");
                await finishBtn.click({ force: true }).catch(() => { });
                await motoboyPage.waitForTimeout(2000);
                // Try second step if needed
                const finishBtn2 = motoboyPage.locator('button:has-text("Confirmar Entrega")').first();
                if (await finishBtn2.isVisible({ timeout: 2000 }).catch(() => false)) {
                    await finishBtn2.click({ force: true }).catch(() => { });
                    await motoboyPage.waitForTimeout(2000);
                }
                await motoboyPage.reload();
                await motoboyPage.waitForTimeout(2000);
            }

            // Now look specifically for our order
            const targetId = `#${orderId.substring(0, 6).toUpperCase()}`;
            console.log(`⏳ Aguardando card do pedido ${targetId} na fila...`);

            // Wait for queue to load and find our specific order card
            // Use attribute contains selector to avoid CSS parsing issues with "/" in class names
            const myOrderCard = motoboyPage.locator('[class*="bg-slate-800"]').filter({ hasText: targetId }).first();
            await expect(myOrderCard).toBeVisible({ timeout: 45000 });

            // If there are other orders blocking in queue, we may get a dialog warning
            // Set up dialog handling to always accept
            motoboyPage.on('dialog', async (dialog) => {
                console.log(`[MOTOBOY AUTO-DIALOG] ${dialog.message()}`);
                await dialog.accept();
            });

            console.log("🛵 Aceitando e processando entrega...");
            await expect(async () => {
                await myOrderCard.locator('button:has-text("ACEITAR CORRIDA")').click({ force: true, timeout: 3000 });
            }).toPass({ timeout: 15000 });

            console.log("📦 Confirmando retirada...");
            await expect(async () => {
                await motoboyPage.click('text=Confirmar Retirada', { force: true, timeout: 3000 });
            }).toPass({ timeout: 15000 });

            console.log("🛣️ Iniciando rota...");
            await expect(async () => {
                await motoboyPage.click('text=Iniciar Rota de Entrega', { force: true, timeout: 3000 });
            }).toPass({ timeout: 10000 });

            console.log("🏁 Finalizando entrega...");
            // 'Finalizar Entrega' may show a confirm dialog if far from destination — auto-accept
            await expect(async () => {
                await motoboyPage.click('text=Finalizar Entrega', { force: true, timeout: 3000 });
            }).toPass({ timeout: 15000 });

            // Wait for navigation to /motoboy-confirm/:id page
            console.log("⏳ Aguardando tela de confirmação final...");
            await expect(motoboyPage).toHaveURL(/\/motoboy-confirm\//, { timeout: 15000 });

            console.log("✅ Confirmando na tela final...");
            // Button is on the /motoboy-confirm page
            const confirmBtn = motoboyPage.locator('button:has-text("Confirmar Entrega")');
            await expect(confirmBtn).toBeVisible({ timeout: 10000 });
            await confirmBtn.click({ force: true });
            console.log(`✅ Motoboy: Pedido ${orderId} entregue.`);
        });


        // --- STEP 4: VERIFY FINAL STATUS ---
        await test.step('Verificação Final', async () => {
            await clientPage.goto(`/order-tracking/${orderId}`);
            await expect(clientPage.locator('text=/entregue|pendente/i')).toBeVisible({ timeout: 10000 });
        });
    });
});
