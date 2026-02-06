import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { MaterialIcon } from '../../components/Shared';

export const PrescriptionUpload = () => {
    const navigate = useNavigate();
    const [file, setFile] = useState<File | null>(null);
    const [observations, setObservations] = useState('');
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!file) {
            alert('Por favor, selecione um arquivo.');
            return;
        }

        setUploading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Usuário não autenticado');

            const fileExt = file.name.split('.').pop();
            const fileName = `${session.user.id}/${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            // Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('prescriptions')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('prescriptions')
                .getPublicUrl(filePath);

            // Here we could save a record in a table like 'user_prescriptions'
            // For now, we'll log it and redirect with a success message
            console.log('✅ Receita enviada:', publicUrl, 'Obs:', observations);

            alert('Receita enviada com sucesso! Você pode anexá-la no chat do pedido agora.');
            navigate(-1);

        } catch (error: any) {
            console.error('❌ Erro no upload:', error);
            alert('Erro ao enviar receita: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="relative flex h-auto min-h-screen w-full max-w-md mx-auto flex-col bg-background-light dark:bg-background-dark shadow-2xl overflow-x-hidden border-x border-black/5 dark:border-white/5 pb-24">
            {/* TopAppBar */}
            <header className="sticky top-0 z-50 bg-background-light dark:bg-background-dark border-b border-black/5 dark:border-white/5">
                <div className="flex items-center p-4 justify-between max-w-md mx-auto">
                    <button onClick={() => navigate(-1)} className="text-background-dark dark:text-white flex size-10 shrink-0 items-center justify-center cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors">
                        <MaterialIcon name="arrow_back_ios" className="text-xl" />
                    </button>
                    <h1 className="text-background-dark dark:text-white text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-10">
                        Enviar Receita Médica
                    </h1>
                </div>
            </header>

            <main className="flex-1 flex flex-col gap-6 p-4 w-full">
                {/* Upload Area */}
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileChange}
                    accept="image/*,application/pdf"
                />

                <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex flex-col items-center gap-6 rounded-3xl border-2 border-dashed ${file ? 'border-primary bg-primary/10' : 'border-primary/40 dark:border-primary/20 bg-primary/5'} px-6 py-14 hover:bg-primary/10 transition-colors cursor-pointer group shadow-sm`}
                >
                    <div className="bg-primary/20 p-4 rounded-full text-primary">
                        <MaterialIcon name={file ? 'check_circle' : 'cloud_upload'} className="text-4xl" />
                    </div>
                    <div className="flex flex-col items-center gap-2">
                        <p className="text-background-dark dark:text-white text-lg font-bold leading-tight text-center">
                            {file ? file.name : 'Fazer upload da foto ou PDF'}
                        </p>
                        <p className="text-background-dark/60 dark:text-white/60 text-sm font-medium leading-normal text-center">
                            Formatos aceitos: JPG, PNG ou PDF
                        </p>
                    </div>
                    <button className="flex min-w-[140px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-10 px-6 bg-primary text-background-dark text-sm font-bold leading-normal tracking-wide shadow-sm hover:scale-105 transition-transform active:scale-95">
                        <span className="truncate">{file ? 'Trocar Arquivo' : 'Selecionar Arquivo'}</span>
                    </button>
                </div>

                {/* TextField (Observations) */}
                <div className="flex flex-col gap-2">
                    <label className="flex flex-col w-full">
                        <p className="text-background-dark dark:text-white text-sm font-bold leading-normal pb-2 px-1 uppercase tracking-wider opacity-60">
                            Observações adicionais
                        </p>
                        <textarea
                            value={observations}
                            onChange={(e) => setObservations(e.target.value)}
                            className="form-input flex w-full resize-none overflow-hidden rounded-2xl text-background-dark dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/30 border border-black/10 dark:border-white/10 bg-white dark:bg-white/5 focus:border-primary min-h-[140px] placeholder:text-background-dark/30 dark:placeholder:text-white/30 p-4 text-base font-medium leading-normal transition-all"
                            placeholder="Ex: Necessito de genérico, entrega urgente, etc."
                        ></textarea>
                    </label>
                </div>

                {/* Privacy & Security Notice */}
                <div className="flex items-center gap-3 px-2 py-2">
                    <div className="text-primary shrink-0">
                        <MaterialIcon name="verified_user" />
                    </div>
                    <p className="text-background-dark/70 dark:text-white/70 text-[13px] leading-snug font-medium">
                        Seus dados estão protegidos. Suas informações médicas são tratadas com total sigilo e segurança conforme a LGPD.
                    </p>
                </div>
            </main>

            {/* Footer Action */}
            <footer className="p-4 bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-md border-t border-black/5 dark:border-white/5 w-full fixed bottom-0 max-w-md left-1/2 -translate-x-1/2 z-20">
                <div className="flex">
                    <button
                        onClick={handleUpload}
                        disabled={uploading || !file}
                        className="flex cursor-pointer items-center justify-center overflow-hidden rounded-full h-14 px-8 flex-1 bg-primary text-background-dark text-lg font-black leading-normal tracking-wide shadow-lg shadow-primary/20 active:scale-95 transition-all uppercase tracking-tighter disabled:opacity-50 disabled:scale-100"
                    >
                        {uploading ? 'Enviando...' : 'Confirmar Envio'}
                    </button>
                </div>
                {/* iOS Home Indicator Spacing */}
                <div className="h-6"></div>
            </footer>
        </div>
    );
};
