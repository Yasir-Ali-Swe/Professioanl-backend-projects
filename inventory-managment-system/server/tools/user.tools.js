import User from "../models/user.model.js";
import mongoose from "mongoose";
import { applyScopeFilter } from "../utils/scopeFilter.js";
import { sanitizeForModel } from "../utils/sanitizeForModel.js";

export const userToolsDeclaration = {
  name: "query_users",
  description: `
Retrieve user and team information.

Use this tool whenever the user asks about:
- Users
- User details
- User profiles
- Active/inactive users
- Verified/unverified users
- User roles (admin, manager, staff, super_admin)
- Team structure
- User activity
- Recently joined users
- User invitations
- User permissions
`,
  parameters: {
    type: "object",
    properties: {
      action: {
        type: "string",
        description: "The operation to perform.",
        enum: [
          "list_users",
          "user_details",
          "search_users",
          "active_users",
          "inactive_users",
          "verified_users",
          "users_by_role",
          "team_structure",
          "recent_users",
          "user_activity",
        ],
      },
      userId: {
        type: "string",
        description: "User ID for details.",
      },
      email: {
        type: "string",
        description: "User email for lookup.",
      },
      name: {
        type: "string",
        description: "User name for search.",
      },
      role: {
        type: "string",
        enum: ["super_admin", "admin", "manager", "staff"],
        description: "Filter by role.",
      },
      isActive: {
        type: "boolean",
        description: "Filter by active status.",
      },
      isVerified: {
        type: "boolean",
        description: "Filter by verification status.",
      },
      limit: {
        type: "integer",
        description: "Maximum number of results (default: 50).",
        minimum: 1,
        maximum: 500,
      },
    },
    required: ["action"],
  },
};

export const userToolsHandler = async (args, scopeContext) => {
  const { scope, organizationId } = scopeContext;
  const {
    action,
    userId,
    email,
    name,
    role,
    isActive,
    isVerified,
    limit = 50,
  } = args;

  const match = applyScopeFilter(scope, organizationId, {});

  switch (action) {
    case "list_users":
    case "search_users": {
      if (name) {
        match.name = { $regex: name, $options: "i" };
      }
      if (email) {
        match.email = { $regex: email, $options: "i" };
      }
      if (role) match.role = role;
      if (isActive !== undefined) match.isActive = isActive;
      if (isVerified !== undefined) match.isVerified = isVerified;

      const users = await User.find(match)
        .select("-password -tokenVersion")
        .sort({ name: 1 })
        .limit(limit)
        .lean();

      const enriched = await enrichUsers(users);

      return sanitizeForModel({
        users: enriched,
        count: enriched.length,
        total: await User.countDocuments(match),
      });
    }

    case "user_details": {
      if (!userId && !email) {
        return { error: "userId or email required" };
      }

      const query = { ...match };
      if (userId) query._id = userId;
      else if (email) query.email = email;

      const user = await User.findOne(query)
        .select("-password -tokenVersion")
        .lean();

      if (!user) return { found: false, message: "User not found" };

      const enriched = await enrichSingleUser(user);

      return sanitizeForModel(enriched);
    }

    case "active_users": {
      match.isActive = true;
      const users = await User.find(match)
        .select("-password -tokenVersion")
        .sort({ name: 1 })
        .limit(limit)
        .lean();

      const enriched = await enrichUsers(users);

      return sanitizeForModel({
        users: enriched,
        count: enriched.length,
        total: await User.countDocuments(match),
      });
    }

    case "inactive_users": {
      match.isActive = false;
      const users = await User.find(match)
        .select("-password -tokenVersion")
        .sort({ name: 1 })
        .limit(limit)
        .lean();

      const enriched = await enrichUsers(users);

      return sanitizeForModel({
        users: enriched,
        count: enriched.length,
        total: await User.countDocuments(match),
      });
    }

    case "verified_users": {
      match.isVerified = true;
      const users = await User.find(match)
        .select("-password -tokenVersion")
        .sort({ name: 1 })
        .limit(limit)
        .lean();

      const enriched = await enrichUsers(users);

      return sanitizeForModel({
        users: enriched,
        count: enriched.length,
        total: await User.countDocuments(match),
      });
    }

    case "users_by_role": {
      if (!role) return { error: "role required" };

      match.role = role;
      const users = await User.find(match)
        .select("-password -tokenVersion")
        .sort({ name: 1 })
        .limit(limit)
        .lean();

      const enriched = await enrichUsers(users);

      return sanitizeForModel({
        role: role,
        users: enriched,
        count: enriched.length,
        total: await User.countDocuments(match),
      });
    }

    case "team_structure": {
      const users = await User.find(match)
        .select("-password -tokenVersion")
        .sort({ role: 1, name: 1 })
        .lean();

      const enriched = await enrichUsers(users);

      const grouped = {};
      for (const user of enriched) {
        if (!grouped[user.role]) {
          grouped[user.role] = [];
        }
        grouped[user.role].push(user);
      }

      return sanitizeForModel({
        structure: grouped,
        totalUsers: enriched.length,
        roles: Object.keys(grouped),
      });
    }

    case "recent_users": {
      const users = await User.find(match)
        .select("-password -tokenVersion")
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      const enriched = await enrichUsers(users);

      return sanitizeForModel({
        users: enriched,
        count: enriched.length,
        total: await User.countDocuments(match),
      });
    }

    case "user_activity": {
      if (!userId && !email) {
        return { error: "userId or email required" };
      }

      const query = { ...match };
      if (userId) query._id = userId;
      else if (email) query.email = email;

      const user = await User.findOne(query)
        .select("-password -tokenVersion")
        .lean();

      if (!user) return { found: false, message: "User not found" };

      const chatLogModel = mongoose.model("ChatLog");
      const chatCount = await chatLogModel.countDocuments({
        userId: user._id,
      });

      const lastChat = await chatLogModel
        .findOne({
          userId: user._id,
        })
        .sort({ createdAt: -1 })
        .select("createdAt")
        .lean();

      return sanitizeForModel({
        user: {
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          isVerified: user.isVerified,
          createdAt: user.createdAt,
        },
        activity: {
          chatCount,
          lastActivity: lastChat?.createdAt || null,
        },
      });
    }

    default: {
      return { error: `Unknown action: ${action}` };
    }
  }
};

async function enrichUsers(users) {
  if (!users || users.length === 0) return [];

  const inviterIds = [
    ...new Set(users.map((u) => u.invitedBy).filter(Boolean)),
  ];
  const inviters = await User.find({ _id: { $in: inviterIds } })
    .select("name email")
    .lean();
  const inviterMap = new Map(inviters.map((inv) => [inv._id.toString(), inv]));

  return users.map((user) => ({
    ...user,
    invitedBy: user.invitedBy
      ? inviterMap.get(user.invitedBy.toString()) || null
      : null,
  }));
}

async function enrichSingleUser(user) {
  let invitedByUser = null;
  if (user.invitedBy) {
    const inviter = await User.findById(user.invitedBy)
      .select("name email")
      .lean();
    invitedByUser = inviter;
  }
  return {
    ...user,
    invitedBy: invitedByUser,
  };
}
