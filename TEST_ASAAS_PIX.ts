// Teste direto da API do Asaas para gerar PIX
// Execute: deno run --allow-net --allow-env TEST_ASAAS_PIX.ts

const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY') || '$aact_YTU5YTE0M2M2N2I4MTliNzk0YzhiYTU5NzM2ZTdkNGM6OjMwNDUwNDUyLTk4MGEtNDQ4ZC05YzU3LWJjNzI0N2QxY2I5NA==';

interface AsaasResponse {
    ok: boolean;
    data?: any;
    status?: number;
    rawText?: string;
}

async function asaasFetch(path: string, options: RequestInit = {}): Promise<AsaasResponse> {
    const url = `https://sandbox.asaas.com/api/v3${path}`;
    
    const response = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'access_token': ASAAS_API_KEY,
            ...options.headers,
        },
    });

    const rawText = await response.text();
    let data = null;
    
    try {
        data = rawText ? JSON.parse(rawText) : null;
    } catch (e) {
        console.error('Failed to parse JSON:', rawText);
    }

    return {
        ok: response.ok,
        status: response.status,
        data,
        rawText,
    };
}

async function testPixGeneration() {
    console.log('🧪 Testando geração de PIX...');
    
    // 1. Criar cliente de teste
    console.log('\n1. Criando cliente...');
    const customerRes = await asaasFetch('/customers', {
        method: 'POST',
        body: JSON.stringify({
            name: 'Farmácia Teste QR',
            email: 'teste@qr.com',
            cpfCnpj: '12345678901234',
            mobilePhone: '11999999999',
            externalReference: 'test-pharmacy-qr',
        }),
    });

    if (!customerRes.ok) {
        console.error('❌ Erro ao criar cliente:', customerRes.rawText);
        return;
    }

    const customerId = customerRes.data.id;
    console.log('✅ Cliente criado:', customerId);

    // 2. Criar pagamento PIX
    console.log('\n2. Criando pagamento PIX...');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dueDate = tomorrow.toISOString().slice(0, 10);

    const pixRes = await asaasFetch('/payments', {
        method: 'POST',
        body: JSON.stringify({
            customer: customerId,
            billingType: 'PIX',
            value: 5.00,
            dueDate: dueDate,
            description: 'Teste PIX QR Code',
            externalReference: `test:${dueDate}:monthly_fee`,
        }),
    });

    if (!pixRes.ok) {
        console.error('❌ Erro ao criar PIX:', pixRes.rawText);
        return;
    }

    const paymentId = pixRes.data.id;
    console.log('✅ PIX criado:', paymentId);
    console.log('📄 Invoice URL:', pixRes.data.invoiceUrl);

    // 3. Buscar QR Code
    console.log('\n3. Buscando QR Code...');
    
    for (let i = 1; i <= 5; i++) {
        console.log(`Tentativa ${i}/5...`);
        
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
        
        const qrRes = await asaasFetch(`/payments/${paymentId}/pixQrCode`);
        
        if (qrRes.ok) {
            console.log('✅ QR Code obtido!');
            console.log('📱 QR Base64:', qrRes.data.encodedImage ? 'Presente' : 'Ausente');
            console.log('📋 Copy/Paste:', qrRes.data.payload || 'Ausente');
            console.log('📅 Expiração:', qrRes.data.expirationDate || 'Ausente');
            break;
        } else {
            console.warn(`❌ Tentativa ${i} falhou:`, qrRes.status, qrRes.rawText);
        }
    }

    // 4. Verificar status do pagamento
    console.log('\n4. Verificando status do pagamento...');
    const statusRes = await asaasFetch(`/payments/${paymentId}`);
    
    if (statusRes.ok) {
        console.log('📊 Status:', statusRes.data.status);
        console.log('💰 Valor:', statusRes.data.value);
        console.log('📅 Due Date:', statusRes.data.dueDate);
    }
}

testPixGeneration().catch(console.error);
