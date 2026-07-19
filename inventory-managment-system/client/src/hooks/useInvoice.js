import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as invoiceApi from "@/api/invoice.api";

// ============ QUERY KEYS ============
const INVOICE_KEYS = {
  all: ["invoices"],
  lists: () => [...INVOICE_KEYS.all, "list"],
  allList: (filters) => [...INVOICE_KEYS.lists(), "all", { ...filters }],
  myList: (filters) => [...INVOICE_KEYS.lists(), "my", { ...filters }],
  details: () => [...INVOICE_KEYS.all, "detail"],
  detail: (id) => [...INVOICE_KEYS.details(), id],
};

// ============ QUERY HOOKS ============

/**
 * Get all invoices with pagination and filters (Admin/Manager only)
 * Query Key: ["invoices", "list", "all", { filters }]
 */
export const useAllInvoices = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: INVOICE_KEYS.allList(filters),
    queryFn: () => invoiceApi.getAllInvoices(filters),
    staleTime: 2 * 60 * 1000,
    ...options,
  });
};

/**
 * Get my invoices with pagination and filters (Staff only)
 * Query Key: ["invoices", "list", "my", { filters }]
 */
export const useMyInvoices = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: INVOICE_KEYS.myList(filters),
    queryFn: () => invoiceApi.getMyInvoices(filters),
    staleTime: 2 * 60 * 1000,
    ...options,
  });
};

/**
 * Get invoice by ID
 * Query Key: ["invoices", "detail", id]
 */
export const useInvoiceById = (id, options = {}) => {
  return useQuery({
    queryKey: INVOICE_KEYS.detail(id),
    queryFn: () => invoiceApi.getInvoiceById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

// ============ MUTATION HOOKS ============

/**
 * Create a new invoice
 * Invalidates: ["invoices"] and stock queries on success
 */
export const useCreateInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: invoiceApi.createInvoice,
    onSuccess: (data) => {
      toast.success(data.message || "Invoice created successfully!");

      // Invalidate all invoice lists
      queryClient.invalidateQueries({
        queryKey: INVOICE_KEYS.lists(),
      });
      // Invalidate stock queries (stock was reduced)
      queryClient.invalidateQueries({
        queryKey: ["stock"],
      });
      queryClient.invalidateQueries({
        queryKey: ["products"],
      });
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.message ||
          "Failed to create invoice. Please try again.",
      );
    },
  });
};

/**
 * Void an invoice (Admin/Manager only)
 * Invalidates: ["invoices"] and stock queries on success
 */
export const useVoidInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: invoiceApi.voidInvoice,
    onSuccess: (data, variables) => {
      toast.success(
        data.message || "Invoice voided successfully. Stock restored.",
      );

      // Invalidate all invoice lists and the specific invoice detail
      queryClient.invalidateQueries({
        queryKey: INVOICE_KEYS.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: INVOICE_KEYS.detail(variables),
      });
      // Invalidate stock queries (stock was restored)
      queryClient.invalidateQueries({
        queryKey: ["stock"],
      });
      queryClient.invalidateQueries({
        queryKey: ["products"],
      });
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.message ||
          "Failed to void invoice. Please try again.",
      );
    },
  });
};
