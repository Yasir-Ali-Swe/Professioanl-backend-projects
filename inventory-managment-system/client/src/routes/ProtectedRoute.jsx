// // routes/ProtectedRoute.jsx
// import { Navigate, Outlet } from 'react-router-dom';
// import { useAuthStore } from '@/store/authStore';

// export const ProtectedRoute = () => {
//     const { isAuthenticated, user } = useAuthStore();

//     if (!isAuthenticated) {
//         return <Navigate to="/login" replace />;
//     }

//     // Check if user has required role
//     if (!user || !user.role) {
//         return <Navigate to="/login" replace />;
//     }

//     return <Outlet />;
// };
// routes/ProtectedRoute.jsx
import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectIsAuthenticated } from '@/store/slices/authSlice';

export const ProtectedRoute = () => {
    const isAuthenticated = useSelector(selectIsAuthenticated);

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
};