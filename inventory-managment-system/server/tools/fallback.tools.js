import mongoose from "mongoose";
import { applyScopeFilter } from "../utils/scopeFilter.js";
import { sanitizeForModel } from "../utils/sanitizeForModel.js";

export const fallbackToolsDeclaration = {
  name: "run_aggregation",
  description: `
Run a sandboxed aggregation query on the database for complex queries not covered by other tools.

Use this as a LAST RESORT when no other tool can handle the query.

Allowed stages: $match, $group, $lookup, $unwind, $project, $sort, $limit, $addFields, $count, $skip
Forbidden stages: $out, $merge, $function, $where, or any write-capable stage

The organization scope will be automatically applied to all queries.
`,
  parameters: {
    type: "object",
    properties: {
      collection: {
        type: "string",
        description: "The collection to query.",
        enum: [
          "anomalies",
          "categories",
          "chatlogs",
          "aiinsights",
          "invoices",
          "organizations",
          "subscriptionplans",
          "demandforecasts",
          "products",
          "purchaseorders",
          "reordersuggestions",
          "stocklogs",
          "subscriptions",
          "suppliers",
          "users",
        ],
      },
      pipeline: {
        type: "string",
        description: "JSON-stringified array of aggregation pipeline stages.",
      },
    },
    required: ["collection", "pipeline"],
  },
};

export const fallbackToolsHandler = async (args, scopeContext) => {
  const { scope, organizationId } = scopeContext;
  const { collection, pipeline } = args;

  if (!collection || !pipeline) {
    return {
      error: "Both collection and pipeline are required",
      valid: false,
    };
  }

  let parsedPipeline;
  try {
    parsedPipeline = JSON.parse(pipeline);
    if (!Array.isArray(parsedPipeline)) {
      throw new Error("Pipeline must be an array");
    }
  } catch (error) {
    return {
      error: `Invalid pipeline JSON: ${error.message}`,
      valid: false,
    };
  }

  const allowedStages = [
    "$match",
    "$group",
    "$lookup",
    "$unwind",
    "$project",
    "$sort",
    "$limit",
    "$addFields",
    "$count",
    "$skip",
  ];

  const forbiddenStages = ["$out", "$merge", "$function", "$where"];

  for (const stage of parsedPipeline) {
    const stageKey = Object.keys(stage)[0];
    if (!allowedStages.includes(stageKey)) {
      if (forbiddenStages.includes(stageKey)) {
        return {
          error: `Forbidden stage ${stageKey} detected. Write operations are not allowed.`,
          valid: false,
        };
      }
      return {
        error: `Unknown or disallowed stage ${stageKey}. Allowed stages: ${allowedStages.join(", ")}`,
        valid: false,
      };
    }

    if (stageKey === "$lookup") {
      const from = stage.$lookup.from;
      const allowedCollections = [
        "anomalies",
        "categories",
        "chatlogs",
        "aiinsights",
        "invoices",
        "organizations",
        "subscriptionplans",
        "demandforecasts",
        "products",
        "purchaseorders",
        "reordersuggestions",
        "stocklogs",
        "subscriptions",
        "suppliers",
        "users",
      ];
      if (!allowedCollections.includes(from)) {
        return {
          error: `Invalid $lookup target collection: ${from}. Only application collections are allowed.`,
          valid: false,
        };
      }
    }
  }

  const modelName =
    collection.charAt(0).toUpperCase() + collection.slice(1).toLowerCase();
  let Model;
  try {
    Model = mongoose.model(modelName);
  } catch (error) {
    return {
      error: `Unknown collection: ${collection}`,
      valid: false,
    };
  }

  const scopeMatch = applyScopeFilter(scope, organizationId, {});

  let finalPipeline;
  if (parsedPipeline.length > 0 && parsedPipeline[0].$match) {
    const firstStage = parsedPipeline[0];
    finalPipeline = [
      { $match: { ...scopeMatch, ...firstStage.$match } },
      ...parsedPipeline.slice(1),
    ];
  } else {
    finalPipeline = [{ $match: scopeMatch }, ...parsedPipeline];
  }

  try {
    const results = await Model.aggregate(finalPipeline);
    return sanitizeForModel({
      valid: true,
      results,
      count: results.length,
    });
  } catch (error) {
    return {
      error: `Aggregation execution failed: ${error.message}`,
      valid: false,
    };
  }
};
