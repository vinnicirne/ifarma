import { Link, useLocation } from 'react-router-dom';

const MaterialIcon = ({ name, fill = false }: { name: string, fill?: boolean }) => (
    <span className="material-symbols-outlined" style={fill ? { fontVariationSettings: "'FILL' 1" } : {}}>{name}</span>
);

const BottomNavigation = () => {
    const location = useLocation();
    const currentPath = location.pathname;

    const navItems = [
        { path: '/', label: 'Início', icon: 'home' },
        { path: '/pharmacies', label: 'Lojas', icon: 'explore' },
        { path: '/favorites', label: 'Favoritos', icon: 'favorite' },
        { path: '/cart', label: 'Carrinho', icon: 'shopping_cart' },
        { path: '/profile', label: 'Perfil', icon: 'person' },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-background-dark/80 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 pb-safe shadow-2xl z-50 max-w-[480px] mx-auto">
            <div className="flex justify-around items-center h-16">
                {navItems.map((item) => {
                    const isActive = currentPath === item.path || (item.path !== '/' && currentPath.startsWith(item.path));
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`flex flex-col items-center gap-0.5 transition-colors ${isActive ? 'text-primary' : 'text-slate-400 hover:text-primary/60'}`}
                        >
                            <MaterialIcon name={item.icon} fill={isActive} />
                            <span className={`text-[10px] ${isActive ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
                        </Link>
                    );
                })}
            </div>
            {/* iOS Home Indicator Spacer */}
            <div className="h-6 w-full pointer-events-none"></div>
        </nav>
    );
};

export default BottomNavigation;
