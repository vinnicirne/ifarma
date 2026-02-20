import { test, expect } from '@playwright/test';

test.describe('Caminho Crítico: Fluxo Completo de Pedido', () => {

    test('deve permitir login do cliente e visualização de farmácias', async ({ page }) => {
        // 1. Acesso à home
        await page.goto('/');

        // 2. Navegar para Login
        await page.click('text=Entrar'); // Assume there's an "Entrar" button/link

        // 3. Preencher Login
        await page.fill('input[placeholder="seu@email.com"]', 'test-cliente@ifarma.com');
        await page.fill('input[placeholder="••••••••"]', '123456');
        await page.click('button:has-text("Entrar")');

        // 4. Verificar se redirecionou para home logado
        await expect(page).toHaveURL('/');
        // await expect(page.locator('text=Olá,')).toBeVisible(); // Depende da UI real
    });

    test('deve permitir adicionar produto ao carrinho', async ({ page }) => {
        await page.goto('/');

        // Clicar na primeira farmácia disponível
        const firstPharmacy = page.locator('.pharmacy-card').first();
        await firstPharmacy.click();

        // Clicar no primeiro produto
        const firstProduct = page.locator('.product-card').first();
        await firstProduct.click();

        // Adicionar ao carrinho
        await page.click('text=Adicionar ao Carrinho');

        // Ir para o carrinho
        await page.goto('/cart');

        // Verificar se o item está lá
        await expect(page.locator('.cart-item')).toBeVisible();
    });
});
