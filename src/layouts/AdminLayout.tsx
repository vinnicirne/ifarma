import { Outlet } from 'react-router-dom';
import Sidebar from '../components/admin/Sidebar';
import Header from '../components/admin/Header';

const AdminLayout = () => {
    return (
        <div className="min-h-screen bg-[#060a08] font-display flex w-full">
            {/* Sidebar Fixa */}
            <Sidebar />

            {/* Área de Conteúdo à Direita */}
            <div className="flex-1 ml-72 flex flex-col min-h-screen bg-[#060a08]">
                <main className="flex-1 px-8 pb-12 pt-8 w-full max-w-[1700px] mx-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;
