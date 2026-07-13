// routes/RoleProtectedRoute.jsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { hasRouteAccess, getDefaultDashboardPath } from './index';

export const RoleProtectedRoute = ({ allowedRoles, redirectPath }) => {
    const { user, isAuthenticated } = useAuthStore();

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (!user || !user.role) {
        return <Navigate to="/login" replace />;
    }

    // Check if user's role is allowed
    if (allowedRoles && !allowedRoles.includes(user.role)) {
        const defaultPath = getDefaultDashboardPath(user.role);
        return <Navigate to={defaultPath} replace />;
    }

    return <Outlet />;
};

// Role-based route guard with path validation
export const RoleRouteGuard = ({ children, path }) => {
    const { user, isAuthenticated } = useAuthStore();

    if (!isAuthenticated || !user) {
        return <Navigate to="/login" replace />;
    }

    if (!hasRouteAccess(user.role, path)) {
        const defaultPath = getDefaultDashboardPath(user.role);
        return <Navigate to={defaultPath} replace />;
    }

    return children;
};