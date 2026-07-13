// layouts/DashboardLayout.jsx
import { Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { selectUser } from '@/store/slices/authSlice';
import { getDashboardRoutes } from '@/routes';

export const DashboardLayout = () => {
    const user = useSelector(selectUser);
    const routes = getDashboardRoutes(user?.role);

    return (
        <SidebarProvider>
            <div className="flex h-screen w-full">
                <Sidebar routes={routes} />
                <div className="flex flex-1 flex-col overflow-hidden">
                    <Navbar routes={routes} />
                    <main className="flex-1 overflow-y-auto p-4 ">
                        <Outlet />
                    </main>
                </div>
            </div>
        </SidebarProvider>
    );
};