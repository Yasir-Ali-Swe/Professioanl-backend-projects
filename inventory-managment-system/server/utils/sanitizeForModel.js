import mongoose from "mongoose";

export const sanitizeForModel = (data) => {
  if (data === null || data === undefined) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeForModel(item));
  }

  if (data && typeof data === "object" && data.toObject) {
    return sanitizeForModel(data.toObject({ virtuals: false }));
  }

  if (data instanceof Date) {
    return data.toISOString();
  }

  if (data instanceof mongoose.Types.ObjectId) {
    return data.toString();
  }

  if (data && typeof data === "object") {
    const sanitized = {};

    for (const [key, value] of Object.entries(data)) {
      if (
        key === "__v" ||
        key === "password" ||
        key === "tokenVersion" ||
        key === "stripeCustomerId" ||
        key === "stripeSubscriptionId" ||
        key === "stripePriceId"
      ) {
        continue;
      }

      sanitized[key] = sanitizeForModel(value);
    }

    return sanitized;
  }

  return data;
};

export const normalizeResponseEnvelope = (
  raw,
  meta = {},
  fallbackSummary = null,
) => {
  const envelope = {
    summary:
      "I processed your request, but I'm having trouble formatting the response. Please try again.",
    table: null,
    detail: null,
    insights: null,
    recommendations: null,
    meta: {
      intent: meta.intent || "unknown",
      entityRefs: meta.entityRefs || null,
    },
  };

  if (!raw) {
    if (fallbackSummary) {
      envelope.summary = fallbackSummary;
    }
    return envelope;
  }

  if (typeof raw !== "object" || Array.isArray(raw)) {
    if (fallbackSummary) {
      envelope.summary = fallbackSummary;
    } else if (raw !== null && raw !== undefined) {
      envelope.summary = String(raw);
    }
    return envelope;
  }

  const sanitized = sanitizeForModel(raw);

  if (sanitized.summary && typeof sanitized.summary === "string") {
    envelope.summary = sanitized.summary;
  } else if (fallbackSummary) {
    envelope.summary = fallbackSummary;
  } else if (sanitized.message && typeof sanitized.message === "string") {
    envelope.summary = sanitized.message;
  }

  if (sanitized.table && typeof sanitized.table === "object") {
    const table = sanitized.table;
    if (
      table.title &&
      Array.isArray(table.columns) &&
      Array.isArray(table.rows)
    ) {
      envelope.table = {
        title: String(table.title),
        columns: table.columns.map((c) => String(c)),
        rows: table.rows.map((row) =>
          Array.isArray(row) ? row.map((cell) => String(cell)) : [String(row)],
        ),
      };
    } else {
      envelope.table = {
        title: String(table.title || "Results"),
        columns: table.columns
          ? table.columns.map((c) => String(c))
          : ["Value"],
        rows: Array.isArray(table.rows)
          ? table.rows.map((row) => [String(row)])
          : [["Data unavailable"]],
      };
    }
  }

  if (sanitized.detail && typeof sanitized.detail === "object") {
    const detail = sanitized.detail;
    if (detail.title && Array.isArray(detail.fields)) {
      envelope.detail = {
        title: String(detail.title),
        fields: detail.fields.map((field) => ({
          label: String(field.label || "Field"),
          value: String(
            field.value !== undefined && field.value !== null
              ? field.value
              : "",
          ),
        })),
      };
    } else if (detail.title) {
      envelope.detail = {
        title: String(detail.title),
        fields: Object.entries(detail)
          .filter(([key]) => key !== "title")
          .map(([key, value]) => ({
            label: key,
            value: String(value !== undefined && value !== null ? value : ""),
          })),
      };
    }
  }

  if (Array.isArray(sanitized.insights) && sanitized.insights.length > 0) {
    envelope.insights = sanitized.insights.map((i) => String(i));
  }

  if (
    Array.isArray(sanitized.recommendations) &&
    sanitized.recommendations.length > 0
  ) {
    envelope.recommendations = sanitized.recommendations.map((r) => String(r));
  }

  if (sanitized.meta && typeof sanitized.meta === "object") {
    if (sanitized.meta.intent) {
      envelope.meta.intent = String(sanitized.meta.intent);
    }
    if (
      sanitized.meta.entityRefs &&
      typeof sanitized.meta.entityRefs === "object"
    ) {
      envelope.meta.entityRefs = {
        ...(envelope.meta.entityRefs || {}),
        ...sanitized.meta.entityRefs,
      };
    }
  }

  if (meta) {
    if (meta.intent) {
      envelope.meta.intent = String(meta.intent);
    }
    if (meta.entityRefs && typeof meta.entityRefs === "object") {
      envelope.meta.entityRefs = {
        ...(envelope.meta.entityRefs || {}),
        ...meta.entityRefs,
      };
    }
  }

  if (typeof envelope.summary !== "string") {
    envelope.summary = String(envelope.summary || "Response processed.");
  }

  return envelope;
};
