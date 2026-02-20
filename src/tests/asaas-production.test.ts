
import { describe, it, expect } from 'vitest';
import dotenv from 'dotenv';

// Carrega variáveis do .env
dotenv.config();

const ASAAS_API_KEY = (process.env.ASAAS_API_KEY || '').replace(/'/g, '');
const ASAAS_BASE_URL = process.env.ASAAS_BASE_URL || "https://api-sandbox.asaas.com/v3";

describe('Asaas Production Integration Test', () => {
    it('should have a production API key', () => {
        expect(ASAAS_API_KEY).toBeDefined();
        expect(ASAAS_API_KEY).toMatch(/^\$aact_prod_/);
    });

    it('should be configured with the production BASE_URL', () => {
        // Se a chave é PROD, a URL deve ser PROD
        if (ASAAS_API_KEY?.startsWith('$aact_prod_')) {
            expect(ASAAS_BASE_URL).toBe('https://api.asaas.com/v3');
        }
    });

    it('should connect to Asaas API and list customers', async () => {
        const response = await fetch(`${ASAAS_BASE_URL}/customers?limit=1`, {
            headers: {
                'access_token': ASAAS_API_KEY || '',
                'accept': 'application/json'
            }
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Asaas Connection Failed:', data);
        }

        expect(response.status).toBe(200);
        expect(data.data).toBeDefined();
    });

    it('should be able to fetch account info', async () => {
        // Verificando se a chave tem permissão para ler dados da conta
        const response = await fetch(`${ASAAS_BASE_URL}/myAccount`, {
            headers: {
                'access_token': ASAAS_API_KEY || '',
                'accept': 'application/json'
            }
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Asaas Connection Failed:', JSON.stringify(data, null, 2));
        }

        expect(response.status).toBe(200);
        expect(data.id).toBeDefined();
        console.log(`Conectado como: ${data.name} (${data.email})`);
    });
});
