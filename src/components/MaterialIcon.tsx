import React from 'react';

interface MaterialIconProps {
    name: string;
    className?: string;
    style?: React.CSSProperties;
    onClick?: (e?: React.MouseEvent) => void;
}

export const MaterialIcon: React.FC<MaterialIconProps> = ({ name, className = "", style = {}, onClick }) => (
    <span
        className={`material-symbols-outlined ${className}`}
        style={style}
        onClick={onClick}
    >
        {name}
    </span>
);
