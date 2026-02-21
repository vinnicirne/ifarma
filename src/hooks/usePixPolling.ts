import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface PixData {
  payment_id: string;
  invoice_url?: string;
  qr_base64?: string | null;
  copy_paste?: string | null;
  status: 'ready' | 'pending_qr';
}

export const usePixPolling = (
  initialPixData: PixData | null,
  onPixReady?: (pixData: PixData) => void,
  onPaymentConfirmed?: () => void
) => {
  const [pixData, setPixData] = useState<PixData | null>(initialPixData);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pollPixStatus = useCallback(async (paymentId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('get-pix-qrcode', {
        body: { payment_id: paymentId }
      });

      if (error) {
        console.error('Erro ao buscar QR Code:', error);
        setError(error.message);
        return;
      }

      if (data?.success) {
        if (data.status === 'paid') {
          // Pagamento já confirmado
          onPaymentConfirmed?.();
          setIsPolling(false);
          return;
        }

        if (data.qr_base64 && data.copy_paste) {
          // QR Code pronto
          const updatedPix: PixData = {
            payment_id: paymentId,
            invoice_url: data.invoice_url,
            qr_base64: data.qr_base64,
            copy_paste: data.copy_paste,
            status: 'ready'
          };
          setPixData(updatedPix);
          onPixReady?.(updatedPix);
          setIsPolling(false);
          setError(null);
        }
      }
    } catch (err) {
      console.error('Erro no polling do PIX:', err);
      setError('Erro ao verificar status do PIX');
    }
  }, [onPixReady, onPaymentConfirmed]);

  const startPolling = useCallback((paymentId: string) => {
    if (!paymentId) return;

    setIsPolling(true);
    setError(null);

    // Polling a cada 4 segundos, máximo 15 tentativas (1 minuto)
    let attempts = 0;
    const maxAttempts = 15;

    const poll = async () => {
      attempts++;
      
      if (attempts > maxAttempts) {
        setIsPolling(false);
        setError('Tempo esgotado aguardando QR Code. Tente novamente.');
        return;
      }

      await pollPixStatus(paymentId);

      if (pixData?.status === 'pending_qr') {
        setTimeout(poll, 4000); // Próxima tentativa em 4 segundos
      }
    };

    poll();
  }, [pollPixStatus, pixData?.status]);

  const stopPolling = useCallback(() => {
    setIsPolling(false);
  }, []);

  return {
    pixData,
    isPolling,
    error,
    startPolling,
    stopPolling,
    pollPixStatus
  };
};
