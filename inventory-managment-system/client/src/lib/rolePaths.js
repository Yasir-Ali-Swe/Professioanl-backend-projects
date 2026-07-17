// lib/rolePaths.js
import { useAuth } from "@/hooks/useRedux";

export const getRolePrefix = (role) => {
  switch (role) {
    case "admin":
      return "admin";
    case "manager":
      return "manager";
    case "staff":
      return "staff";
    case "super_admin":
      return "super-admin";
    default:
      return "admin";
  }
};

export const getRoleBasedPath = (path) => {
  // This hook must be used inside a component
  // For use outside components, use the function below
  return path;
};

// For use in components with the role
export const buildPath = (role, path) => {
  const prefix = getRolePrefix(role);
  return `/${prefix}/${path}`;
};

// Hook for use in components
export const useRolePath = () => {
  const { user } = useAuth(); // Assuming you have a useAuth hook
  const role = user?.role || "admin";

  const getPath = (path) => {
    const prefix = getRolePrefix(role);
    return `/${prefix}/${path}`;
  };

  return { getPath, role, prefix: getRolePrefix(role) };
};
