import Organization from "../models/organization.model.js";
import SubscriptionPlan from "../models/organization.subscriptionPlan.js";
import Subscription from "../models/subscription.model.js";
import User from "../models/user.model.js";
import Product from "../models/product.model.js";
import Invoice from "../models/invoice.model.js";
import { applyScopeFilter } from "../utils/scopeFilter.js";
import { sanitizeForModel } from "../utils/sanitizeForModel.js";

export const organizationToolsDeclaration = {
  name: "query_organization",
  description: `
Retrieve organization and company information.

Use this tool whenever the user asks about:
- Organization profile
- Company information
- Organization details
- Invoice settings
- Tax settings
- Invoice prefix
- Organization status
- Subscription plan
- Organization users
- Organization analytics
`,
  parameters: {
    type: "object",
    properties: {
      action: {
        type: "string",
        description: "The operation to perform.",
        enum: [
          "organization_profile",
          "organization_details",
          "invoice_settings",
          "organization_status",
          "organization_users",
          "organization_analytics",
          "organization_summary",
        ],
      },
      organizationId: {
        type: "string",
        description: "Organization ID (super_admin only).",
      },
      includeUsers: {
        type: "boolean",
        description: "Include user list in response.",
      },
      includeAnalytics: {
        type: "boolean",
        description: "Include analytics in response.",
      },
    },
    required: ["action"],
  },
};

export const organizationToolsHandler = async (args, scopeContext) => {
  const { scope, organizationId } = scopeContext;
  const {
    action,
    organizationId: requestedOrgId,
    includeUsers = false,
    includeAnalytics = false,
  } = args;

  let targetOrgId = organizationId;
  if (scope === "global" && requestedOrgId) {
    targetOrgId = requestedOrgId;
  }

  const match = applyScopeFilter(scope, targetOrgId, {});

  switch (action) {
    case "organization_profile":
    case "organization_details": {
      const organization = await Organization.findOne(match).lean();
      if (!organization)
        return { found: false, message: "Organization not found" };

      let users = [];
      let analytics = {};

      if (includeUsers) {
        users = await User.find({
          organizationId: organization._id,
        })
          .select("name email role isActive isVerified")
          .sort({ name: 1 })
          .lean();
      }

      if (includeAnalytics) {
        const productCount = await Product.countDocuments({
          organizationId: organization._id,
        });
        const invoiceCount = await Invoice.countDocuments({
          organizationId: organization._id,
        });
        const totalRevenue = await Invoice.aggregate([
          { $match: { organizationId: organization._id, status: "paid" } },
          { $group: { _id: null, total: { $sum: "$total" } } },
        ]);

        analytics = {
          productCount,
          invoiceCount,
          totalRevenue: totalRevenue[0]?.total || 0,
        };
      }

      return sanitizeForModel({
        ...organization,
        users: includeUsers ? users : undefined,
        analytics: includeAnalytics ? analytics : undefined,
      });
    }

    case "invoice_settings": {
      const organization = await Organization.findOne(match)
        .select("invoiceSettings invoicePrefix name")
        .lean();

      if (!organization)
        return { found: false, message: "Organization not found" };

      return sanitizeForModel({
        organizationName: organization.name,
        settings: {
          taxRate: organization.invoiceSettings?.taxRate || 0,
          defaultDiscount: organization.invoiceSettings?.defaultDiscount || 0,
          invoicePrefix: organization.invoiceSettings?.invoicePrefix || "INV",
          nextInvoiceNumber:
            organization.invoiceSettings?.nextInvoiceNumber || 1,
        },
      });
    }

    case "organization_status": {
      const organization = await Organization.findOne(match)
        .select("name status subscriptionPlan")
        .lean();

      if (!organization)
        return { found: false, message: "Organization not found" };

      const subscription = await Subscription.findOne({
        organizationId: organization._id,
      }).lean();

      let plan = null;
      if (subscription) {
        plan = await SubscriptionPlan.findById(subscription.subscriptionPlanId)
          .select("name price billingCycle aiFeatures")
          .lean();
      }

      return sanitizeForModel({
        name: organization.name,
        status: organization.status,
        subscription: plan
          ? {
              planName: plan.name,
              price: plan.price,
              billingCycle: plan.billingCycle,
              aiFeatures: plan.aiFeatures,
              status: subscription.status,
              currentPeriodEnd: subscription.currentPeriodEnd,
            }
          : null,
      });
    }

    case "organization_users": {
      const organization = await Organization.findOne(match)
        .select("name")
        .lean();

      if (!organization)
        return { found: false, message: "Organization not found" };

      const users = await User.find({
        organizationId: organization._id,
      })
        .select("-password -tokenVersion")
        .sort({ name: 1 })
        .lean();

      const grouped = {};
      for (const user of users) {
        if (!grouped[user.role]) grouped[user.role] = [];
        grouped[user.role].push({
          name: user.name,
          email: user.email,
          isActive: user.isActive,
          isVerified: user.isVerified,
        });
      }

      return sanitizeForModel({
        organizationName: organization.name,
        users,
        grouped,
        totalUsers: users.length,
      });
    }

    case "organization_analytics": {
      const organization = await Organization.findOne(match)
        .select("name")
        .lean();

      if (!organization)
        return { found: false, message: "Organization not found" };

      const productCount = await Product.countDocuments({
        organizationId: organization._id,
      });

      const activeProducts = await Product.countDocuments({
        organizationId: organization._id,
        isActive: true,
      });

      const lowStock = await Product.countDocuments({
        organizationId: organization._id,
        $expr: { $lte: ["$quantity", "$reorderThreshold"] },
      });

      const invoiceCount = await Invoice.countDocuments({
        organizationId: organization._id,
      });

      const revenue = await Invoice.aggregate([
        { $match: { organizationId: organization._id, status: "paid" } },
        { $group: { _id: null, total: { $sum: "$total" } } },
      ]);

      const unpaid = await Invoice.aggregate([
        { $match: { organizationId: organization._id, status: "unpaid" } },
        {
          $group: { _id: null, total: { $sum: "$total" }, count: { $sum: 1 } },
        },
      ]);

      const userCount = await User.countDocuments({
        organizationId: organization._id,
      });

      return sanitizeForModel({
        organizationName: organization.name,
        analytics: {
          products: {
            total: productCount,
            active: activeProducts,
            lowStock,
            inactive: productCount - activeProducts,
          },
          invoices: {
            total: invoiceCount,
            paid: await Invoice.countDocuments({
              organizationId: organization._id,
              status: "paid",
            }),
            unpaid: await Invoice.countDocuments({
              organizationId: organization._id,
              status: "unpaid",
            }),
            void: await Invoice.countDocuments({
              organizationId: organization._id,
              status: "void",
            }),
          },
          revenue: {
            total: revenue[0]?.total || 0,
            unpaid: unpaid[0]?.total || 0,
            unpaidCount: unpaid[0]?.count || 0,
          },
          users: {
            total: userCount,
          },
        },
      });
    }

    case "organization_summary": {
      const organization = await Organization.findOne(match)
        .select("name status contactEmail phone address")
        .lean();

      if (!organization)
        return { found: false, message: "Organization not found" };

      const subscription = await Subscription.findOne({
        organizationId: organization._id,
      }).lean();

      let plan = null;
      if (subscription) {
        plan = await SubscriptionPlan.findById(subscription.subscriptionPlanId)
          .select("name price billingCycle aiFeatures")
          .lean();
      }

      const [userCount, productCount, invoiceCount] = await Promise.all([
        User.countDocuments({ organizationId: organization._id }),
        Product.countDocuments({ organizationId: organization._id }),
        Invoice.countDocuments({ organizationId: organization._id }),
      ]);

      return sanitizeForModel({
        organization: {
          name: organization.name,
          status: organization.status,
          contactEmail: organization.contactEmail,
          phone: organization.phone,
          address: organization.address,
        },
        subscription: plan
          ? {
              planName: plan.name,
              status: subscription.status,
              aiFeatures: plan.aiFeatures,
            }
          : null,
        stats: {
          users: userCount,
          products: productCount,
          invoices: invoiceCount,
        },
      });
    }

    default: {
      return { error: `Unknown action: ${action}` };
    }
  }
};
