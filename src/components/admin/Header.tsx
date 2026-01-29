import { Calendar, Bell } from 'lucide-react';

const Header = () => {
    return (
        <header className="h-24 flex items-center justify-end px-8 bg-transparent">
            <div className="flex items-center gap-4">
                <div className="bg-[#1a2b23] border border-white/5 px-6 py-3 rounded-2xl flex items-center gap-3 shadow-xl">
                    <Calendar size={18} className="text-primary" />
                    <span className="text-white font-[900] italic text-sm tracking-tighter">25 OUT 2026</span>
                </div>

                <button className="size-12 bg-[#1a2b23] border border-white/5 rounded-2xl flex items-center justify-center relative hover:bg-[#253d31] transition-all group">
                    <Bell size={20} className="text-white group-hover:text-primary transition-colors" />
                    <span className="absolute top-3 right-3 size-2 bg-red-500 rounded-full border-2 border-[#1a2b23]"></span>
                </button>
            </div>
        </header>
    );
};

export default Header;
