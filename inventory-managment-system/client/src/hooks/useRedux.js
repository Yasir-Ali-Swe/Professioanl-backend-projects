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

// Organization hooks
export const useOrganization = () => {
  const dispatch = useDispatch();
  const currentOrganization = useSelector(
    (state) => state.organization.currentOrganization,
  );
  const settings = useSelector((state) => state.organization.settings);
  const invoiceSettings = useSelector(
    (state) => state.organization.invoiceSettings,
  );
  const isLoading = useSelector((state) => state.organization.isLoading);
  const error = useSelector((state) => state.organization.error);

  return {
    currentOrganization,
    settings,
    invoiceSettings,
    isLoading,
    error,
    dispatch,
  };
};

// Product hooks
export const useProducts = () => {
  const dispatch = useDispatch();
  const products = useSelector((state) => state.product?.products || []);
  const selectedProduct = useSelector(
    (state) => state.product?.selectedProduct,
  );
  const total = useSelector((state) => state.product?.total || 0);
  const filters = useSelector((state) => state.product?.filters || {});
  const pagination = useSelector((state) => state.product?.pagination || {});
  const isLoading = useSelector((state) => state.product?.isLoading || false);
  const error = useSelector((state) => state.product?.error);

  return {
    products,
    selectedProduct,
    total,
    filters,
    pagination,
    isLoading,
    error,
    dispatch,
  };
};
