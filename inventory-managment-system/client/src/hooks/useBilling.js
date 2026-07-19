import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as billingApi from "@/api/billing.api";

// ============ QUERY KEYS ============
const BILLING_KEYS = {
  all: ["billing"],
  subscription: () => [...BILLING_KEYS.all, "subscription"],
};

// ============ QUERY HOOKS ============

/**
 * Get current subscription details
 * Query Key: ["billing", "subscription"]
 */
export const useSubscription = (options = {}) => {
  return useQuery({
    queryKey: BILLING_KEYS.subscription(),
    queryFn: () => billingApi.getSubscription(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // Refresh every 10 minutes
    ...options,
  });
};

// ============ MUTATION HOOKS ============

/**
 * Create a checkout session for premium subscription
 * Invalidates: ["billing", "subscription"] on success
 */
export const useCreateCheckoutSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: billingApi.createCheckoutSession,
    onSuccess: (data) => {
      toast.success("Checkout session created successfully!");

      // Open the checkout URL in a new tab
      if (data.checkoutUrl) {
        window.open(data.checkoutUrl, "_blank");
      }

      queryClient.invalidateQueries({
        queryKey: BILLING_KEYS.subscription(),
      });
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.message ||
          "Failed to create checkout session. Please try again.",
      );
    },
  });
};

/**
 * Cancel subscription at end of period
 * Invalidates: ["billing", "subscription"] on success
 */
export const useCancelSubscription = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: billingApi.cancelSubscription,
    onSuccess: (data) => {
      toast.success(
        data.message ||
          "Subscription will be canceled at the end of the billing period.",
      );

      queryClient.invalidateQueries({
        queryKey: BILLING_KEYS.subscription(),
      });
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.message ||
          "Failed to cancel subscription. Please try again.",
      );
    },
  });
};
