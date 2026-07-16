// layouts/DashboardLayout.jsx
import { Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { selectUser } from '@/store/slices/authSlice';
import { getDashboardRoutes } from '@/routes';
import { useState } from 'react';

const SIDEBAR_COOKIE_NAME = 'sidebar_state';
function getInitialSidebarState() {
    if (typeof document === 'undefined') return true;
    const match = document.cookie.match(
        new RegExp(`(?:^|; )${SIDEBAR_COOKIE_NAME}=([^;]*)`)
    );
    if (!match) return true;
    return match[1] === 'true';
}

export const DashboardLayout = () => {
    const user = useSelector(selectUser);
    const routes = getDashboardRoutes(user?.role);
    const [open, setOpen] = useState(getInitialSidebarState);
    return (
        <SidebarProvider open={open} onOpenChange={setOpen}>
            <div className="flex h-screen w-full overflow-hidden">
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