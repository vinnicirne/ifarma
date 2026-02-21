import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface PixData {
  qr_base64: string;
  copy_paste: string;
}

export const usePixPollingFixed = (
  paymentId: string | null,
  enabled: boolean = true
) => {
  const [qrData, setQrData] = useState<PixData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !paymentId) {
      setQrData(null);
      setLoading(false);
      setError(null);
      return;
    }

    let interval: NodeJS.Timeout;
    let attempts = 0;
    const maxAttempts = 20; // Aumentei para 20 tentativas

    const poll = async () => {
      attempts++;
      setLoading(true);
      setError(null);

      try {
        console.log(`[usePixPolling] Tentativa ${attempts}/${maxAttempts} para payment_id: ${paymentId}`);

        const { data, error } = await supabase.functions.invoke('get-pix-qrcode', {
          body: { payment_id: paymentId }
        });

        if (error) {
          console.error('[usePixPolling] Erro:', error);
          setError(error.message);
          // Em caso de erro, ainda tentamos novamente se não excedeu o máximo
          if (attempts < maxAttempts) {
            const nextDelay = attempts <= 5 ? 2000 : 4000;
            interval = setTimeout(poll, nextDelay);
          } else {
            setLoading(false);
          }
          return;
        }

        if (data?.success) {
          if (data.status === 'paid') {
            console.log('[usePixPolling] Pagamento confirmado!');
            setLoading(false);
            return;
          }

          if (data.qr_base64 && data.copy_paste) {
            console.log('[usePixPolling] QR Code obtido!');
            setQrData({
              qr_base64: data.qr_base64,
              copy_paste: data.copy_paste
            });
            setLoading(false);
            setError(null);
            return;
          }
        }

        if (attempts >= maxAttempts) {
          console.error('[usePixPolling] Tempo esgotado');
          setLoading(false);
          setError('Tempo esgotado aguardando QR Code. Tente novamente.');
          return;
        }

        // Se chegou aqui, continua o polling
        const nextDelay = attempts <= 5 ? 2000 : 4000;
        interval = setTimeout(poll, nextDelay);

      } catch (err) {
        console.error('[usePixPolling] Erro no polling:', err);
        setError('Erro ao verificar status do PIX');
        setLoading(false);
      }
    };

    // Inicia a primeira chamada
    poll();

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [paymentId, enabled]);

  return { qrData, loading, error };
};
