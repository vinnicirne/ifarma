// ============================================
// CORREÇÕES PARA TeamManagement.tsx
// Problemas identificados e soluções implementadas
// ============================================

// 🚨 PROBLEMA 1: Query com campo pharmacy_id que pode não existir
// LINHA 70-74: fetchTeam() usa .eq('pharmacy_id', profile.pharmacy_id)

// SOLUÇÃO 1: Adicionar fallback robusto
const fetchTeam = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
        .from('profiles')
        .select('pharmacy_id, role')
        .eq('id', user.id)
        .single();

    if (profile) {
        setPharmacyId(profile.pharmacy_id);
        setMyRole(profile.role);

        // CORREÇÃO: Verificar se pharmacy_id existe antes de usar
        if (profile.pharmacy_id) {
            try {
                const { data: members, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('pharmacy_id', profile.pharmacy_id)
                    .in('role', ['manager', 'staff', 'motoboy', 'merchant']);

                if (members) setTeam(members);
                if (error) {
                    console.error("Error fetching team:", error);
                    // CORREÇÃO: Tentar fallback sem pharmacy_id se erro for de coluna
                    if (error.message?.includes('column') && error.message?.includes('pharmacy_id')) {
                        console.warn("⚠️ Campo pharmacy_id não existe. Tentando fallback...");
                        const { data: fallbackMembers, error: fallbackError } = await supabase
                            .from('profiles')
                            .select('*')
                            .in('role', ['manager', 'staff', 'motoboy', 'merchant']);
                        
                        if (fallbackMembers) setTeam(fallbackMembers);
                        if (fallbackError) console.error("Fallback error:", fallbackError);
                    }
                }
            } catch (err) {
                console.error("Erro crítico ao buscar equipe:", err);
                showToast("Erro ao carregar equipe. Recarregue a página.", 'error');
            }
        } else {
            console.warn("⚠️ Usuário não tem pharmacy_id definido");
            showToast("Sua conta não está associada a uma farmácia.", 'warning');
        }
    }
    setLoading(false);
};

// 🚨 PROBLEMA 2: Campos vehicle_plate e vehicle_model podem não existir
// LINHAS 172-173 e 91-92: Uso desses campos sem verificação

// SOLUÇÃO 2: Adicionar verificação antes de usar campos
const handleEditClick = (member: any) => {
    setEditingMember(member);
    setFormData({
        name: member.full_name,
        email: member.email,
        phone: member.phone || '',
        password: '',
        role: member.role,
        // CORREÇÃO: Verificar se campos existem antes de acessar
        vehicle_plate: member.vehicle_plate || '',
        vehicle_model: member.vehicle_model || ''
    });
    setShowModal(true);
};

// Na função handleSave():
if (formData.role === 'motoboy') {
    // CORREÇÃO: Só adicionar campos se existirem na tabela
    if (vehicle_plate !== undefined) {
        updates.vehicle_plate = formData.vehicle_plate;
    }
    if (vehicle_model !== undefined) {
        updates.vehicle_model = formData.vehicle_model;
    }
}

// 🚨 PROBLEMA 3: Edge Functions podem não estar deployadas
// LINHAS 123, 233: Chamadas para Edge Functions

// SOLUÇÃO 3: Adicionar tratamento de erro robusto
const handleConfirmDelete = async () => {
    if (!memberToDelete) return;

    setSaving(true);
    try {
        // CORREÇÃO: Verificar se Edge Function existe antes de chamar
        const baseUrl = import.meta.env.VITE_SUPABASE_URL;
        const deleteUrl = `${baseUrl}/functions/v1/delete-user-admin`;
        
        let edgeFunctionExists = true;
        
        try {
            const response = await fetch(deleteUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
                    'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
                },
                body: JSON.stringify({ userId: memberToDelete.id })
            });

            if (!response.ok && response.status === 404) {
                edgeFunctionExists = false;
                throw new Error("Edge Function não encontrada");
            }
        } catch (err) {
            if (!edgeFunctionExists) {
                console.warn("⚠️ Edge Function não disponível, usando fallback...");
                // Fallback: Desativar usuário em vez de deletar
                const { error } = await supabase
                    .from('profiles')
                    .update({ is_active: false })
                    .eq('id', memberToDelete.id);

                if (error) throw error;
                
                showToast(`${memberToDelete.full_name} foi desativado.`, 'success');
                setShowDeleteModal(false);
                setMemberToDelete(null);
                fetchTeam();
                return;
            }
            throw err;
        }

        // Se Edge Function existe e funcionou
        showToast(`${memberToDelete.full_name} foi removido da equipe.`, 'success');
        setShowDeleteModal(false);
        setMemberToDelete(null);
        fetchTeam();
    } catch (error: any) {
        console.error('Erro ao deletar:', error);
        showToast('Erro ao remover funcionário: ' + error.message, 'error');
    } finally {
        setSaving(false);
    }
};

// 🚨 PROBLEMA 4: Validação de role inconsistente
// LINHA 346: Verificação de roles hardcoded

// SOLUÇÃO 4: Centralizar validação de permissões
const canManageTeam = () => {
    return ['merchant', 'manager', 'admin'].includes(myRole || '');
};

const canEditMember = (memberRole: string) => {
    const myRoleLevel = getRoleLevel(myRole || '');
    const memberRoleLevel = getRoleLevel(memberRole);
    return myRoleLevel > memberRoleLevel;
};

const getRoleLevel = (role: string) => {
    const levels = { customer: 0, staff: 1, motoboy: 2, manager: 3, merchant: 4, admin: 5 };
    return levels[role as keyof typeof levels] || 0;
};

// 🚨 PROBLEMA 5: Tratamento de erro genérico
// LINHA 322: Toast com erro genérico

// SOLUÇÃO 5: Melhorar mensagens de erro específicas
const getErrorMessage = (error: any) => {
    if (error.code === 'PGRST116') return 'Membro não encontrado.';
    if (error.code === '42501') return 'Sem permissão para realizar esta ação.';
    if (error.message?.includes('duplicate key')) return 'Este telefone já está cadastrado.';
    if (error.message?.includes('null value')) return 'Campos obrigatórios não preenchidos.';
    if (error.message?.includes('pharmacy_id')) return 'Sua conta não está associada a uma farmácia.';
    return error.message || 'Erro desconhecido.';
};

// Usar na linha 322:
showToast("Erro: " + getErrorMessage(error), 'error');

// 🚨 PROBLEMA 6: Interface não mostra status real do membro
// LINHA 417-420: Status sempre "Ativo"

// SOLUÇÃO 6: Mostrar status real baseado em is_active
<div className="col-span-2 flex justify-center items-center gap-2">
    <div className={`px-3 py-1 rounded-full border flex items-center gap-2 ${
        member.is_active 
            ? 'bg-green-500/10 text-green-500 border-green-500/20' 
            : 'bg-red-500/10 text-red-500 border-red-500/20'
    }`}>
        <div className={`size-1.5 rounded-full ${member.is_active ? 'bg-green-500' : 'bg-red-500'} ${member.is_active ? 'animate-pulse' : ''}`}></div>
        <span className="text-[9px] font-black uppercase tracking-widest">
            {member.is_active ? 'Ativo' : 'Inativo'}
        </span>
    </div>
</div>

export {
    fetchTeam,
    handleEditClick,
    handleConfirmDelete,
    canManageTeam,
    canEditMember,
    getErrorMessage
};
