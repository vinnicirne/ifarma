import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const MaterialIcon = ({ name, className = "", style = {} }: { name: string, className?: string, style?: React.CSSProperties }) => (
    <span className={`material-symbols-outlined ${className}`} style={style}>{name}</span>
);

import BottomNavigation from '../components/BottomNavigation';

const UserProfile = ({ session, profile }: { session: any, profile: any }) => {
    const navigate = useNavigate();
    const [addresses, setAddresses] = useState<any[]>([]);
    const [isAddingAddress, setIsAddingAddress] = useState(false);
    const [addressForm, setAddressForm] = useState({
        label: '',
        address: '',
        is_default: false
    });
    const [loading, setLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [cepLoading, setCepLoading] = useState(false);
    const [formData, setFormData] = useState({
        full_name: '',
        cpf: '',
        phone: '',
        avatar_url: '',
        address: ''
    });

    useEffect(() => {
        if (profile) {
            setFormData({
                full_name: profile.full_name || '',
                cpf: profile.cpf || '',
                phone: profile.phone || '',
                avatar_url: profile.avatar_url || '',
                address: profile.address || ''
            });
            fetchAddresses();
        }
    }, [profile]);

    const fetchAddresses = async () => {
        const { data } = await supabase
            .from('user_addresses')
            .select('*')
            .order('is_default', { ascending: false });
        if (data) setAddresses(data);
    };

    const handleCEPBlur = async () => {
        const cep = addressForm.address.replace(/\D/g, '');
        if (cep.length !== 8) return;

        setCepLoading(true);
        try {
            const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            const data = await response.json();
            if (!data.erro) {
                setAddressForm(prev => ({
                    ...prev,
                    address: `${data.logradouro}, ${data.bairro}, ${data.localidade} - ${data.uf}`
                }));
            }
        } catch (error) {
            console.error('Erro ao buscar CEP:', error);
        } finally {
            setCepLoading(false);
        }
    };

    const handleAddAddress = async () => {
        setLoading(true);
        try {
            const { error } = await supabase
                .from('user_addresses')
                .insert({
                    user_id: session.user.id,
                    ...addressForm
                });
            if (error) throw error;
            setIsAddingAddress(false);
            setAddressForm({ label: '', address: '', is_default: false });
            fetchAddresses();
        } catch (error) {
            console.error('Erro ao adicionar endereço:', error);
            alert('Erro ao adicionar endereço.');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAddress = async (id: string) => {
        const { error } = await supabase
            .from('user_addresses')
            .delete()
            .eq('id', id);
        if (!error) fetchAddresses();
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    full_name: formData.full_name,
                    cpf: formData.cpf,
                    phone: formData.phone,
                    avatar_url: formData.avatar_url,
                    address: formData.address
                })
                .eq('id', session.user.id);

            if (error) throw error;
            setIsEditing(false);
            window.location.reload();
        } catch (error) {
            console.error('Erro ao atualizar perfil:', error);
            alert('Erro ao atualizar perfil.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-white min-h-screen flex flex-col font-display transition-colors duration-200">
            {/* Top Navigation Bar */}
            <header className="sticky top-0 z-50 bg-background-light dark:bg-background-dark/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center p-4 justify-between max-w-md mx-auto">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer active:scale-95"
                    >
                        <MaterialIcon name="arrow_back_ios_new" className="text-slate-900 dark:text-white" />
                    </button>
                    <h1 className="text-slate-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center">Perfil</h1>
                    <div className="flex w-10 items-center justify-end">
                        <button className="flex items-center justify-center rounded-lg h-10 w-10 bg-transparent text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors active:scale-95">
                            <MaterialIcon name="settings" />
                        </button>
                    </div>
                </div>
            </header>

            <main className="flex-1 max-w-md mx-auto w-full pb-24">
                {/* Profile Header Section */}
                <section className="flex flex-col items-center py-8 px-4">
                    <div className="relative">
                        <div
                            className="bg-center bg-no-repeat aspect-square bg-cover rounded-full min-h-32 w-32 border-4 border-primary/20 shadow-lg flex items-center justify-center bg-slate-100 dark:bg-slate-800"
                            style={profile?.avatar_url ? { backgroundImage: `url("${profile.avatar_url}")` } : {}}
                        >
                            {!profile?.avatar_url && <MaterialIcon name="person" className="text-6xl text-slate-300" />}
                        </div>
                        <button
                            onClick={() => setIsEditing(true)}
                            className="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-full shadow-lg border-2 border-background-dark hover:bg-primary/90 transition-colors active:scale-95"
                        >
                            <MaterialIcon name="edit" className="text-sm" />
                        </button>
                    </div>
                    <div className="mt-4 flex flex-col items-center text-center">
                        <h2 className="text-slate-900 dark:text-white text-2xl font-bold leading-tight tracking-tight">
                            {profile?.full_name || session?.user?.email?.split('@')[0] || 'Usuário'}
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-1">
                            Membro desde {new Date(session?.user?.created_at || Date.now()).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                        </p>
                        <p className="text-primary text-sm font-semibold mt-0.5">{session?.user?.email}</p>
                    </div>
                </section>

                {/* Addresses Section */}
                <section className="mt-4">
                    <div className="flex items-center justify-between px-4 mb-2">
                        <h3 className="text-slate-900 dark:text-white text-lg font-bold tracking-tight">Meus Endereços</h3>
                        <button onClick={() => setIsAddingAddress(true)} className="text-primary text-sm font-semibold hover:opacity-80 transition-opacity flex items-center gap-1">
                            <MaterialIcon name="add_circle" className="text-sm" /> Adicionar
                        </button>
                    </div>

                    <div className="px-4 space-y-3">
                        {addresses.length > 0 ? (
                            addresses.map((addr) => (
                                <div key={addr.id} className="p-4 bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between group">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-xl ${addr.is_default ? 'bg-primary text-background-dark' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                                            <MaterialIcon name={addr.label === 'Trabalho' ? 'work' : 'home'} />
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="text-slate-900 dark:text-white text-sm font-bold">{addr.label}</p>
                                                {addr.is_default && <span className="text-[8px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-black uppercase">Padrão</span>}
                                            </div>
                                            <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5 truncate max-w-[200px]">{addr.address}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteAddress(addr.id)}
                                        className="opacity-0 group-hover:opacity-100 p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                    >
                                        <MaterialIcon name="delete" className="text-lg" />
                                    </button>
                                </div>
                            ))
                        ) : (
                            <div className="py-8 flex flex-col items-center justify-center text-slate-400 bg-slate-50 dark:bg-slate-800/20 rounded-2xl border border-slate-100 dark:border-slate-800">
                                <MaterialIcon name="location_off" className="text-4xl mb-2 opacity-50" />
                                <p className="text-sm font-medium">Nenhum endereço cadastrado</p>
                            </div>
                        )}
                    </div>
                </section>

                {/* Personal Data Section */}
                <section className="mt-8">
                    <h3 className="text-slate-900 dark:text-white text-lg font-bold tracking-tight px-4 mb-2">Dados Pessoais</h3>
                    <div className="space-y-1">
                        <div className="flex items-center gap-4 bg-white dark:bg-slate-800/50 px-4 min-h-[64px] py-2 justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="text-primary flex items-center justify-center rounded-lg bg-primary/10 shrink-0 size-10">
                                    <MaterialIcon name="person" className="text-[20px]" />
                                </div>
                                <div className="flex flex-col">
                                    <p className="text-slate-900 dark:text-white text-sm font-medium">Nome Completo</p>
                                    <p className="text-slate-500 dark:text-slate-400 text-xs">{profile?.full_name || 'Não informado'}</p>
                                </div>
                            </div>
                            <MaterialIcon name="chevron_right" className="text-slate-400 text-[20px]" />
                        </div>
                        <div className="flex items-center gap-4 bg-white dark:bg-slate-800/50 px-4 min-h-[64px] py-2 justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="text-primary flex items-center justify-center rounded-lg bg-primary/10 shrink-0 size-10">
                                    <MaterialIcon name="badge" className="text-[20px]" />
                                </div>
                                <div className="flex flex-col">
                                    <p className="text-slate-900 dark:text-white text-sm font-medium">CPF</p>
                                    <p className="text-slate-500 dark:text-slate-400 text-xs">{profile?.cpf || 'Não informado'}</p>
                                </div>
                            </div>
                            <MaterialIcon name="lock" className="text-slate-400 text-[20px]" />
                        </div>
                        <div className="flex items-center gap-4 bg-white dark:bg-slate-800/50 px-4 min-h-[64px] py-2 justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="text-primary flex items-center justify-center rounded-lg bg-primary/10 shrink-0 size-10">
                                    <MaterialIcon name="phone" className="text-[20px]" />
                                </div>
                                <div className="flex flex-col">
                                    <p className="text-slate-900 dark:text-white text-sm font-medium">Celular</p>
                                    <p className="text-slate-500 dark:text-slate-400 text-xs">{profile?.phone || 'Não informado'}</p>
                                </div>
                            </div>
                            <MaterialIcon name="chevron_right" className="text-slate-400 text-[20px]" />
                        </div>
                    </div>
                </section>

                {/* Danger Zone */}
                <section className="mt-12 px-4">
                    <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 py-4 rounded-xl font-bold transition-colors active:scale-98 cursor-pointer">
                        <MaterialIcon name="logout" />
                        Sair da Conta
                    </button>
                    <p className="text-center text-slate-500 dark:text-slate-600 text-xs mt-6">Versão 2.4.15 - PharmaMarket iOS</p>
                </section>
            </main>

            {/* Add Address Modal */}
            {isAddingAddress && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Novo Endereço</h3>
                            <button onClick={() => setIsAddingAddress(false)} className="text-slate-400">
                                <MaterialIcon name="close" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Apelido (ex: Casa, Trabalho)</label>
                                <input
                                    type="text"
                                    value={addressForm.label}
                                    onChange={(e) => setAddressForm({ ...addressForm, label: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none"
                                    placeholder="Ex: Trabalho"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Endereço (ou digite o CEP)</label>
                                <textarea
                                    value={addressForm.address}
                                    onChange={(e) => setAddressForm({ ...addressForm, address: e.target.value })}
                                    onBlur={handleCEPBlur}
                                    className="w-full bg-slate-50 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none h-24 resize-none"
                                    placeholder="Rua, Número, Bairro, Cidade ou CEP..."
                                />
                                {cepLoading && <p className="text-[10px] text-primary animate-pulse mt-1">Buscando endereço...</p>}
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="is_default"
                                    checked={addressForm.is_default}
                                    onChange={(e) => setAddressForm({ ...addressForm, is_default: e.target.checked })}
                                    className="accent-primary"
                                />
                                <label htmlFor="is_default" className="text-sm font-medium text-slate-600 dark:text-slate-400">Tornar endereço padrão</label>
                            </div>

                            <button
                                onClick={handleAddAddress}
                                disabled={loading || !addressForm.address || !addressForm.label}
                                className="w-full bg-primary text-black font-bold py-3 rounded-xl mt-4 hover:opacity-90 transition-opacity disabled:opacity-50"
                            >
                                {loading ? 'Salvando...' : 'Cadastrar Endereço'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Profile Modal */}
            {isEditing && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Editar Perfil</h3>
                            <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-slate-600">
                                <MaterialIcon name="close" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Foto de Perfil (URL)</label>
                                <input
                                    type="text"
                                    value={formData.avatar_url}
                                    onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none"
                                    placeholder="https://..."
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome Completo</label>
                                <input
                                    type="text"
                                    value={formData.full_name}
                                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">CPF</label>
                                <input
                                    type="text"
                                    value={formData.cpf}
                                    onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none"
                                    placeholder="000.000.000-00"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Celular</label>
                                <input
                                    type="text"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none"
                                    placeholder="(00) 00000-0000"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Endereço de Entrega</label>
                                <input
                                    type="text"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none"
                                    placeholder="Rua, Número, Bairro, Cidade"
                                />
                            </div>

                            <button
                                onClick={handleSave}
                                disabled={loading}
                                className="w-full bg-primary text-black font-bold py-3 rounded-xl mt-4 hover:opacity-90 transition-opacity disabled:opacity-50"
                            >
                                {loading ? 'Salvando...' : 'Salvar Alterações'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom Navigation Bar */}
            <BottomNavigation />
        </div>
    );
};

export default UserProfile;
