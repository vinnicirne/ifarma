import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const MaterialIcon = ({ name, className = "", style = {} }: { name: string, className?: string, style?: React.CSSProperties }) => (
    <span className={`material-symbols-outlined ${className}`} style={style}>{name}</span>
);

const Favorites = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'Medicamentos' | 'Farmácias'>('Medicamentos');

    return (
        <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark group/design-root overflow-x-hidden max-w-[480px] mx-auto font-display transition-colors duration-200">
            {/* TopAppBar */}
            <div className="flex items-center bg-background-light dark:bg-background-dark p-4 pb-2 justify-between sticky top-0 z-10 border-b border-gray-100 dark:border-white/5">
                <button
                    onClick={() => navigate(-1)}
                    className="text-gray-900 dark:text-white flex size-12 shrink-0 items-center justify-start cursor-pointer active:scale-95 transition-transform"
                >
                    <MaterialIcon name="chevron_left" />
                </button>
                <h2 className="text-gray-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center">Meus Favoritos</h2>
                <div className="flex w-12 items-center justify-end">
                    <button className="flex max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 bg-transparent text-gray-900 dark:text-white gap-2 text-base font-bold leading-normal tracking-[0.015em] min-w-0 p-0 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
                        <MaterialIcon name="search" />
                    </button>
                </div>
            </div>

            {/* SegmentedButtons */}
            <div className="flex px-4 py-3">
                <div className="flex h-11 flex-1 items-center justify-center rounded-xl bg-gray-200 dark:bg-[#482329] p-1 relative">
                    {/* Animated Background for Tab used to be common but simple conditional styling usually suffices for React */}
                    <button
                        onClick={() => setActiveTab('Medicamentos')}
                        className={`flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-lg px-2 text-sm font-semibold leading-normal transition-all ${activeTab === 'Medicamentos' ? 'bg-white dark:bg-background-dark shadow-sm text-primary' : 'text-gray-600 dark:text-[#c9929b] hover:bg-white/50 dark:hover:bg-white/5'}`}
                    >
                        <span className="truncate">Medicamentos</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('Farmácias')}
                        className={`flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-lg px-2 text-sm font-semibold leading-normal transition-all ${activeTab === 'Farmácias' ? 'bg-white dark:bg-background-dark shadow-sm text-primary' : 'text-gray-600 dark:text-[#c9929b] hover:bg-white/50 dark:hover:bg-white/5'}`}
                    >
                        <span className="truncate">Farmácias</span>
                    </button>
                </div>
            </div>

            {/* Content Section */}
            <div className="flex flex-col gap-1 pb-24">

                {activeTab === 'Medicamentos' && (
                    <>
                        {/* Card 1 */}
                        <div className="p-4 py-2">
                            <div className="flex items-stretch justify-between gap-4 rounded-xl bg-white dark:bg-[#33191e] p-4 shadow-sm border border-gray-100 dark:border-none hover:shadow-md transition-shadow">
                                <div className="flex flex-[2_2_0px] flex-col justify-between">
                                    <div className="flex flex-col gap-1 relative">
                                        <div className="absolute top-0 right-0">
                                            <button className="active:scale-90 transition-transform">
                                                <MaterialIcon name="favorite" className="text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }} />
                                            </button>
                                        </div>
                                        <p className="text-gray-500 dark:text-[#c9929b] text-xs font-medium uppercase tracking-wider">Genérico • Medley</p>
                                        <p className="text-gray-900 dark:text-white text-base font-bold leading-tight pr-6">Dipirona Monoidratada 500mg</p>
                                        <p className="text-primary text-lg font-bold leading-normal mt-1">R$ 12,90</p>
                                    </div>
                                    <button className="flex min-w-[120px] max-w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg h-9 px-4 bg-primary text-white gap-2 text-sm font-bold leading-normal w-fit mt-3 shadow-md shadow-primary/20 active:scale-95 transition-all hover:bg-primary/90">
                                        <MaterialIcon name="shopping_cart" className="!text-[18px]" />
                                        <span className="truncate">Adicionar</span>
                                    </button>
                                </div>
                                <div
                                    className="w-32 h-32 bg-gray-50 dark:bg-[#221013] bg-center bg-no-repeat bg-contain rounded-lg shrink-0 border border-gray-100 dark:border-white/5"
                                    style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuDelWrsEyDrHZJt1Fyr7O1PCbo7VqQQT2TUsRo8njDqX3Lxn_KsK6RTji8Q0EvaNytj3ZU1MQqZXun6tfizdEANZTUZBA6UaLUyw1n1-ePSqAi7jH3-fGs2CGo4oFfMRoreO4ZAtX6z47eM9BruYESuekRMQ9J4IpSwf55JD1uDXX5PFeodFqabbpuHAKI8mqq_sxCtKeTlTPAe9rkfVxKYMpGg-AEFq2L4y2w4OXh5RTmlGMq-O0Mk3gmg_nkSDT60IskknHZT3w")' }}
                                >
                                </div>
                            </div>
                        </div>

                        {/* Card 2 */}
                        <div className="p-4 py-2">
                            <div className="flex items-stretch justify-between gap-4 rounded-xl bg-white dark:bg-[#33191e] p-4 shadow-sm border border-gray-100 dark:border-none hover:shadow-md transition-shadow">
                                <div className="flex flex-[2_2_0px] flex-col justify-between">
                                    <div className="flex flex-col gap-1 relative">
                                        <div className="absolute top-0 right-0">
                                            <button className="active:scale-90 transition-transform">
                                                <MaterialIcon name="favorite" className="text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }} />
                                            </button>
                                        </div>
                                        <p className="text-gray-500 dark:text-[#c9929b] text-xs font-medium uppercase tracking-wider">Referência • Bayer</p>
                                        <p className="text-gray-900 dark:text-white text-base font-bold leading-tight pr-6">Aspirina Prevent 100mg c/ 30</p>
                                        <p className="text-primary text-lg font-bold leading-normal mt-1">R$ 24,50</p>
                                    </div>
                                    <button className="flex min-w-[120px] max-w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg h-9 px-4 bg-primary text-white gap-2 text-sm font-bold leading-normal w-fit mt-3 shadow-md shadow-primary/20 active:scale-95 transition-all hover:bg-primary/90">
                                        <MaterialIcon name="shopping_cart" className="!text-[18px]" />
                                        <span className="truncate">Adicionar</span>
                                    </button>
                                </div>
                                <div
                                    className="w-32 h-32 bg-gray-50 dark:bg-[#221013] bg-center bg-no-repeat bg-contain rounded-lg shrink-0 border border-gray-100 dark:border-white/5"
                                    style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuCyYwzmiYPQIgI11uxNzRgHte6boAQz5FGeV7rh_XjZkSw3CnsUks5m_o9P1AxY7prhFZH1aMAmiYxxBoyLObInK6V7Rn96L73meSDBnm9gf0VW7P58xlBJvBrNMntHGQ8iChDusFLP63KE0wTAlMtE6uHxj4WU43vnWXXJ-qXNhhT77vGoWkLrbd9xyx6901qTQjJAmdtO9h5pWeSUBUUW2nsUGnj9vE597PwvS34wntTvEg81Jk_giALU_sI7_y73FFA356uAAQ")' }}
                                >
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* Pharmacy Section Title (Simulation of content if Tab was "Farmácias" or showing below - The HTML showed both tabs but also "Farmácias Salvas" heading below, which suggests maybe list all or toggle. I will respect the tab selection logic for better UX, showing Pharmacies only when that tab is active, BUT the HTML has "Pharmacy Section Title" separated. I will assume it renders Pharmacies when that tab is active for cleaner UX, but let's see. The HTML shows "List Section: Medicines" then "Pharmacy Section Title" then Pharmacy Cards. It looks like a single page with sections. BUT there is a segmented button AT THE TOP. Usually segmented buttons toggle content. I will implement TOGGLE behavior as it is standard for Segmented Control.) */}

                {activeTab === 'Farmácias' && (
                    <>
                        {/* Pharmacy Section Title */}
                        <div className="px-4 pt-4 pb-2">
                            <h3 className="text-gray-900 dark:text-white font-bold text-lg flex items-center gap-2">
                                Farmácias Salvas
                                <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">3</span>
                            </h3>
                        </div>

                        {/* Pharmacy Card 1 */}
                        <div className="p-4 py-2">
                            <div className="flex items-center gap-4 rounded-xl bg-white dark:bg-[#33191e] p-4 shadow-sm border border-gray-100 dark:border-none group cursor-pointer hover:bg-gray-50 dark:hover:bg-[#33191e]/80 transition-colors">
                                <div
                                    className="size-14 rounded-full bg-white flex items-center justify-center overflow-hidden border border-gray-100 shrink-0"
                                    style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuAvCWPstgYzE8r5qK31tPtIYXjnnhjpX51LpzNfj3F6fR7kxoSK2SkKfEySfD54fiauJsbZkyu58m2NusPO_IAPnxyDozHhKOfYabhml_OqX8BwvxSxWtjV-LvWYepxxMKTwjLTjXbMtPLHliAevCPHxhHGVGQPclpcPqipBJtqwO3ZPCj0eopCm8YKmzZ2M-ewtbQJjxkOLEGhGomYiobupm3qVTQhfGu6jFlQ_CoGwr3NvQ4G73THGliIbA3sR2npKa-V-RAcug")', backgroundSize: 'cover' }}
                                >
                                </div>
                                <div className="flex flex-col flex-1">
                                    <div className="flex justify-between items-start">
                                        <p className="text-gray-900 dark:text-white text-base font-bold leading-tight">Droga Raia - Centro</p>
                                        <button className="active:scale-90 transition-transform">
                                            <MaterialIcon name="favorite" className="text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }} />
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="flex items-center text-xs font-bold text-green-500 bg-green-500/10 px-2 py-0.5 rounded">
                                            <span className="size-1.5 rounded-full bg-green-500 mr-1.5 animate-pulse"></span>
                                            ABERTO
                                        </span>
                                        <p className="text-gray-500 dark:text-[#c9929b] text-xs font-normal">800m • 25-35 min</p>
                                    </div>
                                </div>
                                <MaterialIcon name="chevron_right" className="text-gray-400" />
                            </div>
                        </div>

                        {/* Pharmacy Card 2 */}
                        <div className="p-4 py-2">
                            <div className="flex items-center gap-4 rounded-xl bg-white dark:bg-[#33191e] p-4 shadow-sm border border-gray-100 dark:border-none group cursor-pointer hover:bg-gray-50 dark:hover:bg-[#33191e]/80 transition-colors">
                                <div
                                    className="size-14 rounded-full bg-white flex items-center justify-center overflow-hidden border border-gray-100 shrink-0"
                                    style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuBOaMCaundmMJH8fgqOz4_gFuW1l36-1nfIFw61BLR2caHuXmNBsPaNJzY16qCkifC-fqqvWV8ItgznsDsmIfz6ELUugiJ_MbPz934PTebrrE153mZTSyekiLb5JRpIg82hxaJypU9esE7-bCp2MAfHpSQbW7JcNfPhsSuOo6rLZ3hb0HSfPCyk1OTHJxTdBwOOUh0K0HEuF6WSqxCKF7hEcDidE3tb8yMJBAVV1DLbuIcbHq3WICGcpGr5BfM3r3EQN4W45jl60A")', backgroundSize: 'cover' }}
                                >
                                </div>
                                <div className="flex flex-col flex-1">
                                    <div className="flex justify-between items-start">
                                        <p className="text-gray-900 dark:text-white text-base font-bold leading-tight">Drogasil - Shopping</p>
                                        <button className="active:scale-90 transition-transform">
                                            <MaterialIcon name="favorite" className="text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }} />
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="flex items-center text-xs font-bold text-gray-500 bg-gray-500/10 px-2 py-0.5 rounded">
                                            FECHADO
                                        </span>
                                        <p className="text-gray-500 dark:text-[#c9929b] text-xs font-normal">1.2km • Abre 08:00</p>
                                    </div>
                                </div>
                                <MaterialIcon name="chevron_right" className="text-gray-400" />
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Bottom Navigation Bar (iOS style) - Manually included here as requested by design, 
          although App.tsx has its own. This might be a specific view. 
          I will keep consistency with the simulated app flow and use links. */}
            <div className="fixed bottom-0 w-full max-w-[480px] bg-white/80 dark:bg-background-dark/80 backdrop-blur-lg border-t border-gray-200 dark:border-gray-800 flex justify-around py-3 pb-6 px-4 z-50">
                <Link to="/" className="flex flex-col items-center gap-1 text-gray-400 hover:text-primary transition-colors">
                    <MaterialIcon name="home" />
                    <span className="text-[10px] font-medium">Início</span>
                </Link>
                <Link to="/pharmacies" className="flex flex-col items-center gap-1 text-gray-400 hover:text-primary transition-colors">
                    <MaterialIcon name="explore" />
                    <span className="text-[10px] font-medium">Lojas</span>
                </Link>
                <Link to="/favorites" className="flex flex-col items-center gap-1 text-primary">
                    <MaterialIcon name="favorite" style={{ fontVariationSettings: "'FILL' 1" }} />
                    <span className="text-[10px] font-bold">Favoritos</span>
                </Link>
                <Link to="/cart" className="flex flex-col items-center gap-1 text-gray-400 hover:text-primary transition-colors">
                    <MaterialIcon name="shopping_bag" />
                    <span className="text-[10px] font-medium">Sacola</span>
                </Link>
                <Link to="/profile" className="flex flex-col items-center gap-1 text-gray-400 hover:text-primary transition-colors">
                    <MaterialIcon name="person" />
                    <span className="text-[10px] font-medium">Perfil</span>
                </Link>
            </div>
        </div>
    );
};

export default Favorites;
