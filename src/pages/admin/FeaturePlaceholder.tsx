import React from 'react';
import { PageHeader } from '../../components/Shared';
import { MaterialIcon } from '../../components/Shared';

export const FeaturePlaceholder = ({ title }: { title: string }) => {
    return (
        <div className="space-y-6">
            <PageHeader title={title} subtitle="Em breve" />

            <div className="flex flex-col items-center justify-center py-20 bg-slate-50 dark:bg-white/5 rounded-3xl border-2 border-dashed border-slate-200 dark:border-white/10">
                <div className="size-24 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center mb-6">
                    <MaterialIcon name="construction" className="text-4xl text-slate-400" />
                </div>
                <h2 className="text-xl font-black italic text-slate-800 dark:text-white text-center">
                    Funcionalidade em Desenvolvimento
                </h2>
                <p className="text-slate-500 max-w-md text-center mt-2">
                    Este módulo está mapeado no blueprint e será implementado nas próximas etapas de desenvolvimento.
                </p>
            </div>
        </div>
    );
};
