import mongoose from "mongoose";
import Organization from "../models/organization.model.js";
import SubscriptionPlan from "../models/organization.subscriptionPlan.js";
import Subscription from "../models/subscription.model.js";
import User from "../models/user.model.js";
import Product from "../models/product.model.js";
import Invoice from "../models/invoice.model.js";
import { sanitizeForModel } from "../utils/sanitizeForModel.js";

export const organizationToolsDeclaration = {
  name: "query_organization",
  description: `
Retrieve organization and company information.

CRITICAL: Use this tool for ANY query about:
- Company name, organization name, org name
- Company address, organization address
- Contact email, phone number
- Invoice settings (tax rate, default discount, invoice prefix)
- Organization status
- Organization profile
- Company details

This is the ONLY tool that can access organization-level information.
If the user asks "what is the company name?", "show me invoice settings", or "what is the organization address?", this is the tool to call.
`,
  parameters: {
    type: "object",
    properties: {
      action: {
        type: "string",
        description: "The operation to perform.",
        enum: [
          "organization_basic_info",
          "organization_profile",
          "organization_details",
          "invoice_settings",
          "organization_status",
          "organization_users",
          "organization_analytics",
          "organization_summary"
        ]
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

  console.log("🏢 ORGANIZATION TOOL CALLED");
  console.log("📌 Scope:", scope);
  console.log("📌 Organization ID from scopeContext:", organizationId);
  console.log("📌 Organization ID type:", typeof organizationId);

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

  // ============================================================
  // FIX: Properly convert targetOrgId to ObjectId
  // ============================================================
  let orgObjectId;
  if (targetOrgId) {
    // If it's already an ObjectId, use it directly
    if (targetOrgId instanceof mongoose.Types.ObjectId) {
      orgObjectId = targetOrgId;
    }
    // If it's a string, convert it
    else if (typeof targetOrgId === "string") {
      try {
        orgObjectId = new mongoose.Types.ObjectId(targetOrgId);
      } catch (err) {
        console.error("❌ Failed to convert organization ID from string:", err);
        return { found: false, message: "Invalid organization ID format" };
      }
    }
    // If it's an object (like from scopeContext), convert toString
    else {
      try {
        const idStr = targetOrgId.toString();
        orgObjectId = new mongoose.Types.ObjectId(idStr);
      } catch (err) {
        console.error("❌ Failed to convert organization ID from object:", err);
        return { found: false, message: "Invalid organization ID format" };
      }
    }
  }

  console.log("📌 orgObjectId:", orgObjectId);
  console.log("📌 orgObjectId type:", orgObjectId ? typeof orgObjectId : "undefined");

  // Build the match query with proper ObjectId
  const match = {};
  if (orgObjectId) {
    match._id = orgObjectId;
  }

  console.log("📌 Organization match query:", JSON.stringify({
    _id: match._id ? match._id.toString() : null
  }, null, 2));

  // ============================================================
  // FETCH ORGANIZATION
  // ============================================================
  let organization = null;

  try {
    // Try findOne with match
    organization = await Organization.findOne(match).lean();
    console.log("📌 findOne result:", organization ? "✅ Found" : "❌ Not found");
  } catch (err) {
    console.error("❌ Error finding organization:", err);
  }

  // Fallback: try findById directly
  if (!organization && orgObjectId) {
    console.log("🔄 Trying findById fallback...");
    try {
      organization = await Organization.findById(orgObjectId).lean();
      console.log("📌 findById result:", organization ? "✅ Found" : "❌ Not found");
    } catch (err) {
      console.error("❌ Error in findById fallback:", err);
    }
  }

  // If still no organization, try findOne without any filter (debug)
  if (!organization) {
    console.log("🔄 Trying findOne without filter...");
    try {
      organization = await Organization.findOne({}).lean();
      console.log("📌 findOne without filter result:", organization ? "✅ Found" : "❌ Not found");
      if (organization) {
        console.log("📌 Found organization with _id:", organization._id);
      }
    } catch (err) {
      console.error("❌ Error in findOne without filter:", err);
    }
  }

  console.log("📌 Final organization found:", organization ? "✅ YES" : "❌ NO");
  if (organization) {
    console.log("📌 Organization name:", organization.name);
    console.log("📌 Organization invoiceSettings:", JSON.stringify(organization.invoiceSettings, null, 2));
  }

  if (!organization) {
    return {
      found: false,
      message: "No organization information found in the system. Please verify your organization profile is configured."
    };
  }

  // ============================================================
  // HANDLE ACTIONS
  // ============================================================
  switch (action) {
    case "organization_basic_info": {
      const result = {
        name: organization.name,
        contactEmail: organization.contactEmail,
        address: organization.address,
        phone: organization.phone,
        status: organization.status,
        invoiceSettings: organization.invoiceSettings
      };
      console.log("📌 organization_basic_info result:", JSON.stringify(result, null, 2));
      return sanitizeForModel(result);
    }

    case "organization_profile":
    case "organization_details": {
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

      const result = {
        ...organization,
        users: includeUsers ? users : undefined,
        analytics: includeAnalytics ? analytics : undefined,
      };
      console.log("📌 organization_profile result:", JSON.stringify(result, null, 2));
      return sanitizeForModel(result);
    }

    case "invoice_settings": {
      const result = {
        organizationName: organization.name,
        settings: {
          taxRate: organization.invoiceSettings?.taxRate || 0,
          defaultDiscount: organization.invoiceSettings?.defaultDiscount || 0,
          invoicePrefix: organization.invoiceSettings?.invoicePrefix || "INV",
          nextInvoiceNumber: organization.invoiceSettings?.nextInvoiceNumber || 1,
        },
      };
      console.log("📌 invoice_settings result:", JSON.stringify(result, null, 2));
      return sanitizeForModel(result);
    }

    case "organization_status": {
      const subscription = await Subscription.findOne({
        organizationId: organization._id,
      }).lean();

      let plan = null;
      if (subscription) {
        plan = await SubscriptionPlan.findById(subscription.subscriptionPlanId)
          .select("name price billingCycle aiFeatures")
          .lean();
      }

      const result = {
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
      };
      console.log("📌 organization_status result:", JSON.stringify(result, null, 2));
      return sanitizeForModel(result);
    }

    case "organization_users": {
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

      const result = {
        organizationName: organization.name,
        users,
        grouped,
        totalUsers: users.length,
      };
      console.log("📌 organization_users result:", JSON.stringify(result, null, 2));
      return sanitizeForModel(result);
    }

    case "organization_analytics": {
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

      const result = {
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
      };
      console.log("📌 organization_analytics result:", JSON.stringify(result, null, 2));
      return sanitizeForModel(result);
    }

    case "organization_summary": {
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

      const result = {
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
      };
      console.log("📌 organization_summary result:", JSON.stringify(result, null, 2));
      return sanitizeForModel(result);
    }

    default: {
      return { error: `Unknown action: ${action}` };
    }
  }
};
