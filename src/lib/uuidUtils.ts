
export const isUuid = (id?: string | null): boolean => {
    return !!id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
};

export const assertUuid = (id?: string | null, context: string = "Operation"): string => {
    if (!id) throw new Error(`[${context}] UUID ausente`);
    if (!isUuid(id)) throw new Error(`[${context}] UUID inválido: ${id}`);
    return id!;
};
