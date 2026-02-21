// Componente de debug para testar renderização do QR Code
import React from 'react';

const DebugPixModal = ({ pixData }: { pixData: any }) => {
    console.log('DebugPixModal - pixData recebido:', pixData);
    console.log('DebugPixModal - qr_base64 existe:', !!pixData?.qr_base64);
    console.log('DebugPixModal - qr_base64 length:', pixData?.qr_base64?.length);
    console.log('DebugPixModal - qr_base64 prefix:', pixData?.qr_base64?.substring(0, 50));

    if (!pixData) {
        return <div>Nenhum dado PIX</div>;
    }

    return (
        <div style={{ padding: '20px', border: '2px solid red', margin: '20px' }}>
            <h3>🔍 DEBUG PIX MODAL</h3>
            
            <div style={{ marginBottom: '20px' }}>
                <strong>Status:</strong> {pixData.status}
            </div>
            
            <div style={{ marginBottom: '20px' }}>
                <strong>Payment ID:</strong> {pixData.payment_id}
            </div>
            
            <div style={{ marginBottom: '20px' }}>
                <strong>QR Base64:</strong> 
                <div style={{ 
                    background: '#f0f0f0', 
                    padding: '10px', 
                    borderRadius: '5px',
                    wordBreak: 'break-all',
                    maxHeight: '100px',
                    overflow: 'auto'
                }}>
                    {pixData.qr_base64 ? 'SIM (length: ' + pixData.qr_base64.length + ')' : 'NÃO'}
                </div>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
                <strong>Copy/Paste:</strong> {pixData.copy_paste || 'NÃO'}
            </div>
            
            <div style={{ marginBottom: '20px' }}>
                <strong>Invoice URL:</strong> 
                <a href={pixData.invoice_url} target="_blank" style={{ color: 'blue' }}>
                    {pixData.invoice_url}
                </a>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
                <strong>Teste Imagem QR:</strong>
                {pixData.qr_base64 ? (
                    <img 
                        src={`data:image/png;base64,${pixData.qr_base64}`}
                        alt="QR Code Debug"
                        style={{ 
                            border: '2px solid green',
                            maxWidth: '200px',
                            height: 'auto'
                        }}
                    />
                ) : (
                    <div style={{ color: 'red', padding: '10px', background: '#ffe6e6' }}>
                        ❌ QR Base64 ausente
                    </div>
                )}
            </div>
            
            <div style={{ marginBottom: '20px' }}>
                <strong>Teste Manual:</strong>
                <button 
                    onClick={() => {
                        const img = document.querySelector('img[alt="QR Code Debug"]');
                        if (img) {
                            console.log('Imagem encontrada:', img);
                            console.log('Src:', img.src);
                            console.log('NaturalWidth:', img.naturalWidth);
                            console.log('NaturalHeight:', img.naturalHeight);
                        } else {
                            console.log('❌ Imagem NÃO encontrada');
                        }
                    }}
                    >
                    Verificar Imagem no Console
                </button>
            </div>
        </div>
    );
};

export default DebugPixModal;
