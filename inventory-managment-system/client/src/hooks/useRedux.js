// hooks/useRedux.js
import { useDispatch, useSelector } from "react-redux";

// Auth hooks
export const useAuth = () => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const isLoading = useSelector((state) => state.auth.isLoading);
  const error = useSelector((state) => state.auth.error);
  const role = useSelector((state) => state.auth.user?.role);
  const organizationId = useSelector(
    (state) => state.auth.user?.organizationId,
  );

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    role,
    organizationId,
    dispatch,
  };
};

// UI hooks (only notifications)
export const useUI = () => {
  const dispatch = useDispatch();
  const notifications = useSelector((state) => state.ui.notifications);
  const unreadCount = useSelector((state) => state.ui.unreadCount);

  return {
    notifications,
    unreadCount,
    dispatch,
  };
};
