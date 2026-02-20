from playwright.sync_api import sync_playwright

def test_botao_entrar_existe():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()

        page.goto("http://localhost:5173")
        page.wait_for_load_state("networkidle")

        # procura um botão ou link com o texto "Entrar"
        botao = page.get_by_text("Entrar")

        # verifica se ele está visível na tela
        assert botao.is_visible()

        browser.close()
