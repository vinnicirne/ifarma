import { test, expect } from '@playwright/test';

test.describe('Fluxos de Autenticação e Navegação Inicial', () => {

    test('deve permitir login como Cliente', async ({ page }) => {
        await page.goto('/');

        // Abrir Menu
        await page.click('button:has(.material-symbols-outlined:text("menu"))');

        // Clicar em Acessar Conta
        await page.click('text=Acessar Conta');

        // Preencher Login
        await page.fill('input[type="email"]', 'test-cliente@ifarma.com');
        await page.fill('input[type="password"]', 'password123');
        await page.click('button:has-text("Entrar")');

        // Esperar redirecionamento e verificar mensagem de boas-vindas no Menu
        // O login do cliente redireciona para '/'
        await expect(page).toHaveURL('/', { timeout: 15000 });
        await page.click('button:has(.material-symbols-outlined:text("menu"))');
        await expect(page.locator('h2:has-text("Olá,")')).toBeVisible({ timeout: 10000 });
    });

    test('deve permitir login como Gestor', async ({ page }) => {
        await page.goto('/gestor/login');

        await page.fill('input[placeholder*="E-mail"]', 'test-gestor@ifarma.com');
        await page.fill('input[type="password"]', 'password123');
        await page.click('button:has-text("Acessar Painel")'); // FIXED TEXT

        // Verificar se está no dashboard do gestor
        await expect(page).toHaveURL(/\/gestor/, { timeout: 15000 });
        await expect(page.locator('h1:has-text("Olá,")')).toBeVisible({ timeout: 10000 });
    });

    test('deve permitir login como Motoboy', async ({ page }) => {
        await page.goto('/motoboy-login');

        await page.fill('input[placeholder*="email"]', 'test-motoboy@ifarma.com');
        // No, fill takes the value, not the placeholder for the second arg.
        await page.fill('input[placeholder="Digite sua senha"]', 'password123');

        await page.click('button:has-text("Entrar")');

        // Verificar se está no dashboard do motoboy
        await expect(page).toHaveURL(/\/motoboy-dashboard/, { timeout: 15000 });
        // Motoboy dashboard has "Boa tarde, [Name]!" or "Bom dia, [Name]!"
        await expect(page.locator('h1:has-text("Boa")')).toBeVisible({ timeout: 10000 });
    });
});
