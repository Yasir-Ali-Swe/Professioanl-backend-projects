import mongoose from "mongoose";

export const applyScopeFilter = (scope, organizationId, matchStage = {}) => {
  let match = { ...matchStage };

  if (scope === "org") {
    if (!organizationId) {
      throw new Error("organizationId is required when scope is 'org'");
    }

    const orgId =
      typeof organizationId === "string"
        ? new mongoose.Types.ObjectId(organizationId)
        : organizationId;

    match.organizationId = orgId;
  }

  return match;
};

export const applyScopeFilterToQuery = (query, scope, organizationId) => {
  if (scope === "org") {
    if (!organizationId) {
      throw new Error("organizationId is required when scope is 'org'");
    }
    const orgId =
      typeof organizationId === "string"
        ? new mongoose.Types.ObjectId(organizationId)
        : organizationId;
    query.organizationId = orgId;
  }
  return query;
};
