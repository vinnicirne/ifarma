import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const MaterialIcon = ({ name, className = "" }: { name: string, className?: string }) => (
    <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

const PartnerRegistration = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        // Step 1: Owner Info
        owner_email: '',
        owner_phone: '',
        owner_name: '',
        owner_last_name: '',
        owner_cpf: '',
        owner_rg: '',
        owner_rg_issuer: '',

        // Step 2: Store Info
        cnpj: '',
        legal_name: '',
        trade_name: '',
        establishment_phone: '',
        specialty: 'Farmácia',

        // Step 3: Address & Details
        cep: '',
        address: '',
        address_number: '',
        address_complement: '',
        neighborhood: '',
        city: '',
        state: '',
        delivery_enabled: 'false' // string for radio input logic
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleCEPBlur = async () => {
        const cep = formData.cep.replace(/\D/g, '');
        if (cep.length !== 8) return;

        try {
            const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            const data = await response.json();
            if (!data.erro) {
                setFormData(prev => ({
                    ...prev,
                    address: data.logradouro,
                    neighborhood: data.bairro,
                    city: data.localidade,
                    state: data.uf
                }));
            }
        } catch (error) {
            console.error("Erro CEP", error);
        }
    };

    const nextStep = () => setStep(prev => prev + 1);
    const prevStep = () => setStep(prev => prev - 1);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const fullAddress = `${formData.address}, ${formData.address_number} - ${formData.neighborhood}, ${formData.city} - ${formData.state}`;

            const payload = {
                name: formData.trade_name, // Main name used in app
                address: fullAddress, // Simple address string for compatibility
                status: 'Pendente',
                plan: 'Gratuito',

                // Detailed Info
                owner_name: formData.owner_name,
                owner_last_name: formData.owner_last_name,
                owner_email: formData.owner_email,
                owner_phone: formData.owner_phone,
                owner_cpf: formData.owner_cpf,
                owner_rg: formData.owner_rg,
                owner_rg_issuer: formData.owner_rg_issuer,

                cnpj: formData.cnpj,
                legal_name: formData.legal_name,
                trade_name: formData.trade_name,
                establishment_phone: formData.establishment_phone,
                specialty: formData.specialty,
                delivery_enabled: formData.delivery_enabled === 'true'
            };

            const { data, error } = await supabase.from('pharmacies').insert([payload]).select();

            if (error) throw error;

            alert("Cadastro realizado com sucesso! Nossa equipe entrará em contato.");
            navigate('/login'); // Or to a success page

        } catch (error: any) {
            console.error(error);
            alert("Erro ao realizar cadastro: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-zinc-900 font-display flex flex-col items-center py-10 px-4">
            {/* Header / Logo Area */}
            <div className="mb-8 text-center">
                <h1 className="text-3xl font-black italic text-primary tracking-tighter">ifarma</h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-widest mt-1">Parceiros</p>
            </div>

            <div className="w-full max-w-2xl bg-white dark:bg-zinc-800 rounded-[32px] shadow-2xl overflow-hidden border border-slate-100 dark:border-white/5">
                {/* Progress Bar */}
                <div className="bg-slate-100 dark:bg-black/20 h-2 w-full flex">
                    <div className={`h-full bg-primary transition-all duration-500 ${step === 1 ? 'w-1/3' : step === 2 ? 'w-2/3' : 'w-full'}`}></div>
                </div>

                <form onSubmit={handleSubmit} className="p-8 md:p-12">

                    {/* STEP 1: OWNER INFO */}
                    {step === 1 && (
                        <div className="animate-fade-in">
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                                <MaterialIcon name="person" className="text-primary" />
                                Sobre o dono do negócio
                            </h2>

                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">E-mail</label>
                                    <input required name="owner_email" type="email" value={formData.owner_email} onChange={handleChange} className="w-full h-12 px-4 rounded-xl bg-slate-50 dark:bg-zinc-900 border-none focus:ring-2 focus:ring-primary outline-none" placeholder="exemplo@email.com" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Celular (com DDD)</label>
                                    <input required name="owner_phone" value={formData.owner_phone} onChange={handleChange} className="w-full h-12 px-4 rounded-xl bg-slate-50 dark:bg-zinc-900 border-none focus:ring-2 focus:ring-primary outline-none" placeholder="(00) 00000-0000" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Nome</label>
                                    <input required name="owner_name" value={formData.owner_name} onChange={handleChange} className="w-full h-12 px-4 rounded-xl bg-slate-50 dark:bg-zinc-900 border-none focus:ring-2 focus:ring-primary outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Sobrenome</label>
                                    <input required name="owner_last_name" value={formData.owner_last_name} onChange={handleChange} className="w-full h-12 px-4 rounded-xl bg-slate-50 dark:bg-zinc-900 border-none focus:ring-2 focus:ring-primary outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">CPF</label>
                                    <input required name="owner_cpf" value={formData.owner_cpf} onChange={handleChange} className="w-full h-12 px-4 rounded-xl bg-slate-50 dark:bg-zinc-900 border-none focus:ring-2 focus:ring-primary outline-none" placeholder="000.000.000-00" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">RG</label>
                                    <input required name="owner_rg" value={formData.owner_rg} onChange={handleChange} className="w-full h-12 px-4 rounded-xl bg-slate-50 dark:bg-zinc-900 border-none focus:ring-2 focus:ring-primary outline-none" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Órgão Emissor</label>
                                    <select name="owner_rg_issuer" value={formData.owner_rg_issuer} onChange={handleChange} className="w-full h-12 px-4 rounded-xl bg-slate-50 dark:bg-zinc-900 border-none focus:ring-2 focus:ring-primary outline-none appearance-none">
                                        <option value="">Selecione...</option>
                                        <option value="SSP">SSP - Secretaria de Segurança Pública</option>
                                        <option value="DETRAN">DETRAN</option>
                                        <option value="OUTROS">Outros</option>
                                    </select>
                                </div>

                                <div className="md:col-span-2 flex items-center gap-3 p-4 bg-primary/10 rounded-xl mt-2">
                                    <input type="checkbox" required className="accent-primary size-5" />
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-tight">
                                        Concordo em receber contato via WhatsApp para fins de cadastro.
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: STORE INFO */}
                    {step === 2 && (
                        <div className="animate-fade-in">
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                                <MaterialIcon name="store" className="text-primary" />
                                Sobre o estabelecimento
                            </h2>

                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">CNPJ</label>
                                    <input required name="cnpj" value={formData.cnpj} onChange={handleChange} className="w-full h-12 px-4 rounded-xl bg-slate-50 dark:bg-zinc-900 border-none focus:ring-2 focus:ring-primary outline-none" placeholder="00.000.000/0000-00" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Razão Social</label>
                                    <input required name="legal_name" value={formData.legal_name} onChange={handleChange} className="w-full h-12 px-4 rounded-xl bg-slate-50 dark:bg-zinc-900 border-none focus:ring-2 focus:ring-primary outline-none" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Nome Fantasia (Nome da Loja no App)</label>
                                    <input required name="trade_name" value={formData.trade_name} onChange={handleChange} className="w-full h-12 px-4 rounded-xl bg-slate-50 dark:bg-zinc-900 border-none focus:ring-2 focus:ring-primary outline-none" />
                                </div>
                                <div className="md:col-span-1">
                                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Telefone da Loja</label>
                                    <input required name="establishment_phone" value={formData.establishment_phone} onChange={handleChange} className="w-full h-12 px-4 rounded-xl bg-slate-50 dark:bg-zinc-900 border-none focus:ring-2 focus:ring-primary outline-none" />
                                </div>
                                <div className="md:col-span-1">
                                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Especialidade</label>
                                    <select name="specialty" value={formData.specialty} onChange={handleChange} className="w-full h-12 px-4 rounded-xl bg-slate-50 dark:bg-zinc-900 border-none focus:ring-2 focus:ring-primary outline-none">
                                        <option value="Farmácia">Farmácia</option>
                                        <option value="Drogaria">Drogaria</option>
                                        <option value="Manipulação">Manipulação</option>
                                        <option value="Suplementos">Suplementos</option>
                                        <option value="Homeopatia">Homeopatia</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: ADDRESS */}
                    {step === 3 && (
                        <div className="animate-fade-in">
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                                <MaterialIcon name="location_on" className="text-primary" />
                                Endereço e Logística
                            </h2>

                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="md:col-span-1">
                                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">CEP</label>
                                    <input required name="cep" value={formData.cep} onChange={handleChange} onBlur={handleCEPBlur} className="w-full h-12 px-4 rounded-xl bg-slate-50 dark:bg-zinc-900 border-none focus:ring-2 focus:ring-primary outline-none" placeholder="00000-000" />
                                </div>
                                <div className="md:col-span-1">
                                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Cidade</label>
                                    <input disabled value={formData.city} className="w-full h-12 px-4 rounded-xl bg-slate-100 dark:bg-black/40 border-none text-slate-500" />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Endereço</label>
                                    <input required name="address" value={formData.address} onChange={handleChange} className="w-full h-12 px-4 rounded-xl bg-slate-50 dark:bg-zinc-900 border-none focus:ring-2 focus:ring-primary outline-none" />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Número</label>
                                    <input required name="address_number" value={formData.address_number} onChange={handleChange} className="w-full h-12 px-4 rounded-xl bg-slate-50 dark:bg-zinc-900 border-none focus:ring-2 focus:ring-primary outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Complemento</label>
                                    <input name="address_complement" value={formData.address_complement} onChange={handleChange} className="w-full h-12 px-4 rounded-xl bg-slate-50 dark:bg-zinc-900 border-none focus:ring-2 focus:ring-primary outline-none" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Bairro</label>
                                    <input required name="neighborhood" value={formData.neighborhood} onChange={handleChange} className="w-full h-12 px-4 rounded-xl bg-slate-50 dark:bg-zinc-900 border-none focus:ring-2 focus:ring-primary outline-none" />
                                </div>

                                <div className="md:col-span-2 mt-4">
                                    <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2">O estabelecimento possui serviço de entrega próprio?</label>
                                    <div className="flex gap-6">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="radio" name="delivery_enabled" value="true" checked={formData.delivery_enabled === 'true'} onChange={handleChange} className="accent-primary size-5" />
                                            <span>Sim, temos entregadores</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="radio" name="delivery_enabled" value="false" checked={formData.delivery_enabled === 'false'} onChange={handleChange} className="accent-primary size-5" />
                                            <span>Não, preciso de parceiros</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Footer Buttons */}
                    <div className="mt-10 flex gap-4 pt-6 border-t border-slate-100 dark:border-white/5">
                        {step > 1 && (
                            <button type="button" onClick={prevStep} className="flex-1 h-14 rounded-2xl font-bold uppercase tracking-widest text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                                Voltar
                            </button>
                        )}

                        {step < 3 ? (
                            <button type="button" onClick={nextStep} className="flex-1 bg-primary text-background-dark h-14 rounded-2xl font-black uppercase tracking-widest hover:opacity-90 transition-opacity shadow-lg shadow-primary/20">
                                Continuar
                            </button>
                        ) : (
                            <button disabled={loading} type="submit" className="flex-1 bg-primary text-background-dark h-14 rounded-2xl font-black uppercase tracking-widest hover:opacity-90 transition-opacity shadow-lg shadow-primary/20 disabled:opacity-50">
                                {loading ? 'Finalizando...' : 'Concluir Cadastro'}
                            </button>
                        )}
                    </div>

                </form>
            </div>

            <p className="mt-8 text-xs text-slate-400 text-center max-w-md">
                Ao continuar, você concorda com nossos Termos de Uso e Política de Privacidade.
                Precisa de ajuda? <a href="#" className="text-primary hover:underline">Fale conosco</a>.
            </p>
        </div>
    );
};

export default PartnerRegistration;
