// services/resolvers/userResolver.js
import userModel from "../../models/user.model.js";
import { COLUMN_DEFINITIONS, buildFlatTable } from "../chatResponseFormatter.service.js";
import {
  stripTriggerPhrases,
  escapeRegex,
  buildDisambiguationResult,
  buildNotFoundResult,
} from "./chatEntityExtractor.js";

export const resolveUserQuery = async (queryText = "", args = {}, organizationId = null) => {
  const lowerQuery = (queryText || "").toLowerCase();
  const baseFilter = organizationId ? { organizationId } : {};

  // Case 1: Admin Profile Lookup
  if (
    lowerQuery.includes("admin profile") ||
    lowerQuery.includes("admin user") ||
    lowerQuery.includes("who is the admin") ||
    lowerQuery.includes("admin of the organization") ||
    args.role === "admin"
  ) {
    const adminUsers = await userModel
      .find({ ...baseFilter, role: "admin" })
      .populate("invitedBy", "name email")
      .select("-password -tokenVersion")
      .lean();

    if (!adminUsers || adminUsers.length === 0) {
      return buildNotFoundResult("admin user", "organization");
    }

    const enhancedAdmins = adminUsers.map((user) => ({
      userName: user.name,
      email: user.email,
      role: "admin",
      status: user.isActive ? "Active" : "Inactive",
      isVerified: user.isVerified ? "Yes" : "No",
      invitedBy: user.invitedBy?.name || "System Admin",
      createdAt: user.createdAt,
    }));

    const { columns, rows } = buildFlatTable(COLUMN_DEFINITIONS.users_compact, enhancedAdmins);
    const adminName = adminUsers[0].name;

    return {
      success: true,
      data: rows,
      fields: columns,
      count: adminUsers.length,
      tableTitle: "Organization Admin Profile",
      framingLine: `Here is the full profile for ${adminName} (admin, registered ${new Date(adminUsers[0].createdAt).toLocaleDateString("en-PK", { month: "long", year: "numeric" })}):`,
      reply: `Here is the full profile for ${adminName} (admin, registered ${new Date(adminUsers[0].createdAt).toLocaleDateString("en-PK", { month: "long", year: "numeric" })}):`,
      isAnalytical: false, // Record lookup -> NO insight
      summary: {
        adminName,
        adminEmail: adminUsers[0].email,
        totalAdmins: adminUsers.length,
        isEmpty: false,
      },
    };
  }

  // Case 2: Staff Members List Lookup
  if (
    lowerQuery.includes("staff member") ||
    lowerQuery.includes("staff members") ||
    lowerQuery.includes("show staff") ||
    lowerQuery.includes("list staff") ||
    args.role === "staff" ||
    args.role === "manager"
  ) {
    const staffFilter = {
      ...baseFilter,
      role: { $in: ["manager", "staff"] },
    };

    const staffUsers = await userModel
      .find(staffFilter)
      .select("name email role isActive createdAt")
      .lean();

    if (!staffUsers || staffUsers.length === 0) {
      return buildNotFoundResult("staff members", "organization");
    }

    const enhancedStaff = staffUsers.map((u) => ({
      userName: u.name,
      email: u.email,
      role: u.role,
      status: u.isActive ? "Active" : "Inactive",
    }));

    const { columns, rows } = buildFlatTable(COLUMN_DEFINITIONS.users_compact, enhancedStaff);

    return {
      success: true,
      data: rows,
      fields: columns,
      count: staffUsers.length,
      tableTitle: "Staff Members",
      framingLine: `Found ${staffUsers.length} staff member${staffUsers.length === 1 ? "" : "s"} in your organization:`,
      reply: `Found ${staffUsers.length} staff member${staffUsers.length === 1 ? "" : "s"} in your organization:`,
      isAnalytical: false, // Record lookup -> NO insight
      summary: {
        totalStaff: staffUsers.length,
        isEmpty: false,
      },
    };
  }

  // Case 3: Specific User Full Profile Lookup
  const rawSearch = args.search || args.identifier || stripTriggerPhrases(queryText);
  const isGeneric = ["all users", "users", "org users", "user", "all"].includes((rawSearch || "").toLowerCase().trim());
  const searchTerm = isGeneric ? "" : rawSearch;
  if (searchTerm) {
    const userSearchFilter = {
      ...baseFilter,
      $or: [
        { name: new RegExp(escapeRegex(searchTerm), "i") },
        { email: new RegExp(escapeRegex(searchTerm), "i") },
      ],
    };

    const matchingUsers = await userModel
      .find(userSearchFilter)
      .populate("invitedBy", "name email")
      .select("-password -tokenVersion")
      .lean();

    if (matchingUsers.length > 1) {
      return buildDisambiguationResult("users", searchTerm, matchingUsers);
    }

    if (matchingUsers.length === 1) {
      const targetUser = matchingUsers[0];
      const enhancedUser = [
        {
          userName: targetUser.name,
          email: targetUser.email,
          role: targetUser.role,
          status: targetUser.isActive ? "Active" : "Inactive",
          isVerified: targetUser.isVerified ? "Yes" : "No",
          invitedBy: targetUser.invitedBy?.name || "N/A",
          createdAt: targetUser.createdAt,
        },
      ];

      const { columns, rows } = buildFlatTable(COLUMN_DEFINITIONS.users_compact, enhancedUser);

      return {
        success: true,
        data: rows,
        fields: columns,
        count: 1,
        tableTitle: `User Profile: ${targetUser.name}`,
        framingLine: `Here is the full profile for ${targetUser.name} (${targetUser.role}):`,
        reply: `Here is the full profile for ${targetUser.name} (${targetUser.role}):`,
        isAnalytical: false, // Record lookup -> NO insight
        summary: {
          userName: targetUser.name,
          email: targetUser.email,
          role: targetUser.role,
          isEmpty: false,
        },
      };
    }
  }

  // Generic Users List Fallback
  const allUsers = await userModel.find(baseFilter).select("name email role isActive").lean();
  const { columns, rows } = buildFlatTable(
    COLUMN_DEFINITIONS.users_compact,
    allUsers.map((u) => ({
      userName: u.name,
      email: u.email,
      role: u.role,
      status: u.isActive ? "Active" : "Inactive",
    })),
  );

  return {
    success: true,
    data: rows,
    fields: columns,
    count: allUsers.length,
    tableTitle: "All Users",
    framingLine: `Found ${allUsers.length} total user${allUsers.length === 1 ? "" : "s"}:`,
    reply: `Found ${allUsers.length} total user${allUsers.length === 1 ? "" : "s"}:`,
    isAnalytical: false,
    summary: { totalUsers: allUsers.length, isEmpty: allUsers.length === 0 },
  };
};
