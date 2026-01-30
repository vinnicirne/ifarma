import React from 'react';

export const MaterialIcon = ({ name, className = "", fill = false }: { name: string, className?: string, fill?: boolean }) => (
    <span className={`material-symbols-outlined ${className} ${fill ? 'FILL-1' : ''}`} style={fill ? { fontVariationSettings: "'FILL' 1" } : {}}>
        {name}
    </span>
);
