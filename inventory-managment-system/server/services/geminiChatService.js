import { GoogleGenerativeAI } from "@google/generative-ai";
import { getSchemaDescription } from "../utils/schemaIntrospector.js";
import {
  sanitizeForModel,
  normalizeResponseEnvelope,
} from "../utils/sanitizeForModel.js";
import { getToolDeclarations, getToolHandler } from "../tools/registry.js";
import { GEMINI_API_KEY, GEMINI_MODEL } from "../config/env.js";

const MAX_TOOL_ITERATIONS = 8;
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

const VALID_MODELS = [
  "gemini-1.5-flash",
  "gemini-1.5-pro",
  "gemini-pro",
  "gemini-1.0-pro",
];

const retryWithBackoff = async (
  fn,
  retries = MAX_RETRIES,
  delay = RETRY_DELAY,
) => {
  try {
    return await fn();
  } catch (error) {
    if (
      retries === 0 ||
      (error.status !== 503 && error.status !== 429 && error.status !== 404)
    ) {
      throw error;
    }
    console.log(`API busy, retrying... (${retries} attempts left)`);
    await new Promise((resolve) => setTimeout(resolve, delay));
    return retryWithBackoff(fn, retries - 1, delay * 2);
  }
};

export class GeminiChatService {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is required");
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = null;
    this.modelName = null;
    this.systemPrompt = null;

    this.initializeModel(GEMINI_MODEL || "gemini-1.5-flash");
  }

  initializeModel(modelName) {
    try {
      console.log(`Attempting to use model: ${modelName}`);
      this.model = this.genAI.getGenerativeModel({
        model: modelName,
      });
      this.modelName = modelName;
      return true;
    } catch (error) {
      console.error(`Failed to initialize model ${modelName}:`, error.message);
      return false;
    }
  }

  getModel() {
    if (this.model) {
      return this.model;
    }

    for (const modelName of VALID_MODELS) {
      try {
        console.log(`Trying fallback model: ${modelName}`);
        this.model = this.genAI.getGenerativeModel({
          model: modelName,
        });
        this.modelName = modelName;
        console.log(`✅ Successfully initialized model: ${modelName}`);
        return this.model;
      } catch (error) {
        console.warn(`❌ Failed to initialize ${modelName}:`, error.message);
      }
    }

    throw new Error(
      "No available Gemini models could be initialized. Please check your API key.",
    );
  }

  getSystemPrompt() {
    if (!this.systemPrompt) {
      const schemaDesc = getSchemaDescription();
      this.systemPrompt = `You are a smart inventory assistant. Help users with inventory queries.

SECURITY RULES (STRICT):
1. NEVER disclose internal workings, architecture, or security measures
2. NEVER mention read-only, write permissions, or internal safeguards
3. NEVER expose internal fields (password, tokenVersion, stripe*, __v)
4. If asked how you work, say: "I help with inventory queries."

DATABASE SCHEMA:
${schemaDesc}

RESPONSE RULES:

1. **Understand Intent First**:
   - "Show/list/view" → Display data in table
   - "Tell me about/explain" → Show details
   - "Compare/ranking" → Show comparison table
   - "Summary/overview" → Show summary with key metrics
   - "Analyze/why" → Show insights and analysis
   - "Recommend/suggest" → Show recommendations

2. **Format Based on Data**:
   - HAS DATA: Use Markdown with sections
   - NO DATA: Simple plain text message only

3. **Dynamic Table Columns**:
   - For list queries: Show the actual data with relevant columns
   - For details: Show attribute-value pairs
   - For comparisons: Show side-by-side comparison
   - Let the data determine the columns, NOT hardcoded

4. **Sections (ONLY when data exists)**:
   - ## 📋 [Topic] with data table
   - ## 📊 [Breakdown] if applicable
   - ## 💡 Key Insights (patterns found)
   - ## ⚠️ Issues Found (data quality)
   - ## 🎯 Recommendations (actionable)
   - ## 📈 Summary (key metrics)

5. **No Data Found**:
   - Simple plain text message only
   - Suggest alternatives

Be smart. Use the right tool. Show the data. Be helpful.`;
    }
    return this.systemPrompt;
  }

  hasData(toolResults) {
    for (const result of toolResults) {
      if (result.result && typeof result.result === "object") {
        // Check arrays
        if (Array.isArray(result.result) && result.result.length > 0)
          return true;

        // Check nested arrays
        const arrayFields = [
          "products",
          "invoices",
          "suppliers",
          "categories",
          "items",
          "users",
          "orders",
          "logs",
        ];
        for (const field of arrayFields) {
          if (
            Array.isArray(result.result[field]) &&
            result.result[field].length > 0
          )
            return true;
        }

        // Check counts
        if (result.result.count && result.result.count > 0) return true;
        if (result.result.total && result.result.total > 0) return true;
        if (result.result.totalCount && result.result.totalCount > 0)
          return true;

        // Check single entity
        if (result.result._id && result.result.found !== false) return true;
        if (result.result.found === true) return true;

        // Check if it has any keys with values
        const keys = Object.keys(result.result);
        if (keys.length > 0 && !result.result.error) {
          for (const key of keys) {
            if (
              result.result[key] !== null &&
              result.result[key] !== undefined &&
              result.result[key] !== "" &&
              result.result[key] !== false
            ) {
              if (!["message", "error", "found"].includes(key)) {
                return true;
              }
            }
          }
        }
      }
    }
    return false;
  }

  async processMessage(
    userId,
    conversationId,
    message,
    history,
    scopeContext,
    contextNote = null,
  ) {
    const model = this.getModel();
    const systemPrompt = this.getSystemPrompt();
    const tools = getToolDeclarations();

    const contents = [];

    contents.push({
      role: "user",
      parts: [{ text: systemPrompt }],
    });

    contents.push({
      role: "model",
      parts: [
        {
          text: "I understand. I'll help with inventory queries.",
        },
      ],
    });

    for (const entry of history) {
      if (entry.role === "user" || entry.role === "model") {
        contents.push({
          role: entry.role,
          parts: [{ text: entry.parts }],
        });
      }
    }

    let userMessage = message;
    if (contextNote) {
      userMessage = `Context: ${contextNote}\n\nUser question: ${message}`;
    }
    contents.push({
      role: "user",
      parts: [{ text: userMessage }],
    });

    let iterationCount = 0;
    let conversationHistory = [...contents];
    let toolResults = [];

    while (iterationCount < MAX_TOOL_ITERATIONS) {
      iterationCount++;

      try {
        const chat = model.startChat({
          tools: [{ functionDeclarations: tools }],
          history: conversationHistory,
        });

        const lastUserMessage =
          conversationHistory[conversationHistory.length - 1];

        const result = await retryWithBackoff(() =>
          chat.sendMessage(lastUserMessage.parts[0].text),
        );

        const response = result.response;
        const functionCalls = response.functionCalls();

        if (!functionCalls || functionCalls.length === 0) {
          break;
        }

        const functionResponses = [];
        for (const call of functionCalls) {
          const handler = getToolHandler(call.name);
          if (!handler) {
            functionResponses.push({
              name: call.name,
              response: { error: `Unknown tool: ${call.name}` },
            });
            continue;
          }

          try {
            const result = await handler(call.args, scopeContext);
            const sanitized = sanitizeForModel(result);
            functionResponses.push({
              name: call.name,
              response: sanitized,
            });
            toolResults.push({ tool: call.name, result: sanitized });
          } catch (error) {
            console.error(`Error executing tool ${call.name}:`, error);
            functionResponses.push({
              name: call.name,
              response: { error: `Tool execution failed: ${error.message}` },
            });
          }
        }

        conversationHistory.push({
          role: "model",
          parts: [{ text: response.text() }],
        });

        for (const fr of functionResponses) {
          conversationHistory.push({
            role: "user",
            parts: [
              {
                text: JSON.stringify({
                  functionResponse: {
                    name: fr.name,
                    response: fr.response,
                  },
                }),
              },
            ],
          });
        }
      } catch (error) {
        console.error("Error in tool loop:", error);
        return {
          markdown: `❌ Error: ${error.message || "I encountered an error processing your request. Please try again."}`,
          intent: "error",
          entityRefs: null,
        };
      }
    }

    if (iterationCount >= MAX_TOOL_ITERATIONS) {
      return {
        markdown:
          "⚠️ Your query is complex and I've reached the maximum steps. Please simplify your question.",
        intent: "max_iterations",
        entityRefs: null,
      };
    }

    const dataExists = this.hasData(toolResults);

    try {
      let finalPrompt;

      if (!dataExists) {
        finalPrompt = `IMPORTANT: No data was found matching the user's query.

Respond with ONLY a simple, helpful plain text message:
- NO markdown formatting, NO headings, NO tables, NO sections
- 2-3 sentences maximum
- Explain no matching records were found
- Suggest alternatives

Example: "I couldn't find any records matching your query. You might want to try different search criteria or check if the data exists in the system."`;
      } else {
        finalPrompt = `Now provide your final response.

The user asked: "${message}"

Based on the data retrieved:
1. Determine the INTENT (list, detail, compare, summary, analyze, recommend)
2. Display the data appropriately:
   - List/View → Table with relevant columns
   - Detail → Attribute-value pairs
   - Compare → Comparison table
   - Summary → Key metrics with brief explanation
   - Analyze → Data with insights
3. Let the DATA determine the columns, NOT predefined
4. Add sections based on what the data shows:
   - Main data table first
   - Breakdowns if data supports it
   - Insights if patterns found
   - Issues if problems found
   - Recommendations if data supports it
   - Summary with key metrics

The table columns should be derived from the actual data structure.

Be smart and flexible. Format based on the data.`;
      }

      conversationHistory.push({
        role: "user",
        parts: [
          {
            text: finalPrompt,
          },
        ],
      });

      const finalChat = model.startChat({
        history: conversationHistory,
      });

      const finalResult = await retryWithBackoff(() =>
        finalChat.sendMessage("Generate the final response now."),
      );

      let markdownResponse = finalResult.response.text();

      if (!dataExists) {
        markdownResponse = markdownResponse
          .replace(/^##\s.*$/gm, "")
          .replace(/^\|.*\|$/gm, "")
          .replace(/^[-|:\s]+$/gm, "")
          .replace(/^\*.*\*$/gm, "")
          .replace(/^>.*$/gm, "")
          .replace(/^---$/gm, "")
          .replace(/^[📋📊💡⚠️🎯📈]\s.*$/gm, "")
          .replace(/\n{3,}/g, "\n\n")
          .trim();
      }

      const intent =
        toolResults.length > 0
          ? toolResults.map((t) => t.tool).join(", ")
          : "none";

      const entityRefs = {};
      for (const result of toolResults) {
        if (result.result && typeof result.result === "object") {
          const idFields = [
            "_id",
            "productId",
            "invoiceId",
            "supplierId",
            "categoryId",
            "userId",
            "organizationId",
          ];
          for (const field of idFields) {
            if (result.result[field]) {
              entityRefs[field] = result.result[field];
            }
          }
          if (result.result.product && result.result.product._id) {
            entityRefs.productId = result.result.product._id;
          }
          if (result.result.supplier && result.result.supplier._id) {
            entityRefs.supplierId = result.result.supplier._id;
          }
        }
      }

      return {
        markdown: markdownResponse,
        intent: intent,
        entityRefs: Object.keys(entityRefs).length > 0 ? entityRefs : null,
      };
    } catch (error) {
      console.error("Error in final response:", error);
      return {
        markdown: `❌ Error: ${error.message || "I encountered an error generating the final response. Please try again."}`,
        intent: "error",
        entityRefs: null,
      };
    }
  }
}

// import { GoogleGenerativeAI } from "@google/generative-ai";
// import { getSchemaDescription } from "../utils/schemaIntrospector.js";
// import {
//   sanitizeForModel,
//   normalizeResponseEnvelope,
// } from "../utils/sanitizeForModel.js";
// import { getToolDeclarations, getToolHandler } from "../tools/registry.js";
// import { GEMINI_API_KEY, GEMINI_MODEL } from "../config/env.js";

// const MAX_TOOL_ITERATIONS = 6;
// const MAX_RETRIES = 3;
// const RETRY_DELAY = 2000;

// // Valid free models (in order of preference)
// const VALID_MODELS = [
//   "gemini-1.5-flash",
//   "gemini-1.5-pro",
//   "gemini-pro",
//   "gemini-1.0-pro",
// ];

// const retryWithBackoff = async (
//   fn,
//   retries = MAX_RETRIES,
//   delay = RETRY_DELAY,
// ) => {
//   try {
//     return await fn();
//   } catch (error) {
//     if (
//       retries === 0 ||
//       (error.status !== 503 && error.status !== 429 && error.status !== 404)
//     ) {
//       throw error;
//     }
//     console.log(`API busy, retrying... (${retries} attempts left)`);
//     await new Promise((resolve) => setTimeout(resolve, delay));
//     return retryWithBackoff(fn, retries - 1, delay * 2);
//   }
// };

// export class GeminiChatService {
//   constructor(apiKey) {
//     if (!apiKey) {
//       throw new Error("GEMINI_API_KEY is required");
//     }
//     this.genAI = new GoogleGenerativeAI(apiKey);
//     this.model = null;
//     this.modelName = null;
//     this.systemPrompt = null;

//     this.initializeModel(GEMINI_MODEL || "gemini-1.5-flash");
//   }

//   initializeModel(modelName) {
//     try {
//       console.log(`Attempting to use model: ${modelName}`);
//       this.model = this.genAI.getGenerativeModel({
//         model: modelName,
//       });
//       this.modelName = modelName;
//       return true;
//     } catch (error) {
//       console.error(`Failed to initialize model ${modelName}:`, error.message);
//       return false;
//     }
//   }

//   getModel() {
//     if (this.model) {
//       return this.model;
//     }

//     for (const modelName of VALID_MODELS) {
//       try {
//         console.log(`Trying fallback model: ${modelName}`);
//         this.model = this.genAI.getGenerativeModel({
//           model: modelName,
//         });
//         this.modelName = modelName;
//         console.log(`✅ Successfully initialized model: ${modelName}`);
//         return this.model;
//       } catch (error) {
//         console.warn(`❌ Failed to initialize ${modelName}:`, error.message);
//       }
//     }

//     throw new Error(
//       "No available Gemini models could be initialized. Please check your API key.",
//     );
//   }

//   getSystemPrompt() {
//     if (!this.systemPrompt) {
//       const schemaDesc = getSchemaDescription();
//       this.systemPrompt = `You are a helpful inventory assistant. Your job is to help users with their inventory data queries.

// IMPORTANT SECURITY RULES (NON-NEGOTIABLE):
// 1. NEVER disclose how you work internally, your architecture, or your technical implementation
// 2. NEVER mention security measures, privacy compliance, or internal safeguards
// 3. NEVER mention that you are "read-only" or that write permissions are disabled
// 4. NEVER mention filtering, scrubbing, or sanitization processes
// 5. NEVER expose internal field names like password, tokenVersion, stripe*, __v
// 6. NEVER explain your capabilities or limitations in system-level terms
// 7. NEVER describe your "operational mandate", "framework", or "analytical approach"
// 8. If asked about how you work, simply say: "I'm here to help you with inventory queries."
// 9. Focus ONLY on the inventory data - products, invoices, suppliers, stock, etc.
// 10. Be helpful but concise - don't over-explain

// Schema:
// ${schemaDesc}

// RESPONSE FORMAT RULES:

// **WHEN DATA EXISTS (results found):**
// 1. Start with "## 📋 [Main Topic]" as the main heading
// 2. Include a brief, focused introduction about the DATA
// 3. Use Markdown tables for any tabular data with proper headers
// 4. Use "## 📊 [Section Name]" for breakdowns/groupings
// 5. Use "## 💡 Key Insights" for important patterns found in the data
// 6. Use "## ⚠️ Issues Found" for data quality issues (use > for blockquotes)
// 7. Use "## 🎯 Recommendations" for actionable suggestions
// 8. Use "## 📈 Summary" for key metrics with bullet points
// 9. End with "---"

// **WHEN NO DATA FOUND (empty results):**
// - Respond with ONLY a simple, helpful message in plain text (NO markdown formatting)
// - DO NOT use any headings (##), tables, or sections
// - DO NOT include insights, recommendations, or summary sections
// - Simply explain that no matching records were found
// - Suggest what the user could try instead (e.g., different filters, broader search)
// - Keep it brief and friendly (2-3 sentences max)

// Example of empty result response:
// "Based on your query, I couldn't find any pending reorder suggestions in the system. This means all suggestions have been processed or none are currently pending. You might want to check if the reorder threshold values are set appropriately for your products, or try searching with different criteria."

// EMOJI GUIDE (ONLY USE WHEN DATA EXISTS):
// - 📋 = Overview/Summary
// - 📊 = Data/Statistics/Tables
// - 💡 = Insights/Patterns
// - ⚠️ = Issues/Warnings
// - 🎯 = Recommendations
// - 📈 = Metrics/Performance

// IMPORTANT:
// - NEVER mention system architecture, security, read-only, or internal mechanisms
// - Focus purely on the inventory data itself
// - Be professional but direct - no fluff about capabilities
// - If a user asks "how do you work", simply say "I help with inventory queries" and move on
// - When no data is found, keep response simple WITHOUT tables or sections

// Now respond to the user's query based on the data you retrieve.`;
//     }
//     return this.systemPrompt;
//   }

//   /**
//    * Check if the tool results contain any actual data
//    */
//   hasData(toolResults) {
//     for (const result of toolResults) {
//       if (result.result && typeof result.result === "object") {
//         // Check for arrays with length > 0
//         if (Array.isArray(result.result)) {
//           if (result.result.length > 0) return true;
//         }
//         // Check for objects with actual data (not just empty/null)
//         if (
//           result.result.products &&
//           Array.isArray(result.result.products) &&
//           result.result.products.length > 0
//         ) {
//           return true;
//         }
//         if (
//           result.result.invoices &&
//           Array.isArray(result.result.invoices) &&
//           result.result.invoices.length > 0
//         ) {
//           return true;
//         }
//         if (
//           result.result.suppliers &&
//           Array.isArray(result.result.suppliers) &&
//           result.result.suppliers.length > 0
//         ) {
//           return true;
//         }
//         if (
//           result.result.categories &&
//           Array.isArray(result.result.categories) &&
//           result.result.categories.length > 0
//         ) {
//           return true;
//         }
//         if (
//           result.result.items &&
//           Array.isArray(result.result.items) &&
//           result.result.items.length > 0
//         ) {
//           return true;
//         }
//         // Check for count > 0
//         if (result.result.count && result.result.count > 0) {
//           return true;
//         }
//         if (result.result.total && result.result.total > 0) {
//           return true;
//         }
//         // Check for single entity found
//         if (result.result._id && !result.result.found === false) {
//           return true;
//         }
//         // Check for found: true
//         if (result.result.found === true) {
//           return true;
//         }
//       }
//     }
//     return false;
//   }

//   async processMessage(
//     userId,
//     conversationId,
//     message,
//     history,
//     scopeContext,
//     contextNote = null,
//   ) {
//     const model = this.getModel();
//     const systemPrompt = this.getSystemPrompt();
//     const tools = getToolDeclarations();

//     const contents = [];

//     contents.push({
//       role: "user",
//       parts: [{ text: systemPrompt }],
//     });

//     contents.push({
//       role: "model",
//       parts: [
//         {
//           text: "I understand. I'll help with inventory queries.",
//         },
//       ],
//     });

//     for (const entry of history) {
//       if (entry.role === "user" || entry.role === "model") {
//         contents.push({
//           role: entry.role,
//           parts: [{ text: entry.parts }],
//         });
//       }
//     }

//     let userMessage = message;
//     if (contextNote) {
//       userMessage = `Context: ${contextNote}\n\nUser question: ${message}`;
//     }
//     contents.push({
//       role: "user",
//       parts: [{ text: userMessage }],
//     });

//     let iterationCount = 0;
//     let conversationHistory = [...contents];
//     let toolResults = [];

//     while (iterationCount < MAX_TOOL_ITERATIONS) {
//       iterationCount++;

//       try {
//         const chat = model.startChat({
//           tools: [{ functionDeclarations: tools }],
//           history: conversationHistory,
//         });

//         const lastUserMessage =
//           conversationHistory[conversationHistory.length - 1];

//         const result = await retryWithBackoff(() =>
//           chat.sendMessage(lastUserMessage.parts[0].text),
//         );

//         const response = result.response;
//         const functionCalls = response.functionCalls();

//         if (!functionCalls || functionCalls.length === 0) {
//           break;
//         }

//         const functionResponses = [];
//         for (const call of functionCalls) {
//           const handler = getToolHandler(call.name);
//           if (!handler) {
//             functionResponses.push({
//               name: call.name,
//               response: { error: `Unknown tool: ${call.name}` },
//             });
//             continue;
//           }

//           try {
//             const result = await handler(call.args, scopeContext);
//             const sanitized = sanitizeForModel(result);
//             functionResponses.push({
//               name: call.name,
//               response: sanitized,
//             });
//             toolResults.push({ tool: call.name, result: sanitized });
//           } catch (error) {
//             console.error(`Error executing tool ${call.name}:`, error);
//             functionResponses.push({
//               name: call.name,
//               response: { error: `Tool execution failed: ${error.message}` },
//             });
//           }
//         }

//         conversationHistory.push({
//           role: "model",
//           parts: [{ text: response.text() }],
//         });

//         for (const fr of functionResponses) {
//           conversationHistory.push({
//             role: "user",
//             parts: [
//               {
//                 text: JSON.stringify({
//                   functionResponse: {
//                     name: fr.name,
//                     response: fr.response,
//                   },
//                 }),
//               },
//             ],
//           });
//         }
//       } catch (error) {
//         console.error("Error in tool loop:", error);
//         return {
//           markdown: `❌ **Error**: ${error.message || "I encountered an error processing your request. Please try again."}`,
//           intent: "error",
//           entityRefs: null,
//         };
//       }
//     }

//     if (iterationCount >= MAX_TOOL_ITERATIONS) {
//       return {
//         markdown:
//           "⚠️ **Complex Query**: Your query is complex and I've reached the maximum steps. Please simplify your question.",
//         intent: "max_iterations",
//         entityRefs: null,
//       };
//     }

//     // Check if any data was found
//     const dataExists = this.hasData(toolResults);

//     try {
//       let finalPrompt;

//       if (!dataExists) {
//         // No data found - simple response with no formatting
//         finalPrompt = `IMPORTANT: No data was found matching the user's query.

// Your response MUST be:
// - A simple, helpful plain text message (NO markdown formatting)
// - NO headings, NO tables, NO sections, NO emojis
// - 2-3 sentences maximum
// - Explain that no matching records were found
// - Suggest what the user could try instead

// Example: "Based on your query, I couldn't find any pending reorder suggestions in the system. This means all suggestions have been processed or none are currently pending. You might want to check if the reorder threshold values are set appropriately for your products, or try searching with different criteria."

// Respond with ONLY that simple message, nothing else.`;
//       } else {
//         // Data exists - full formatted response
//         finalPrompt = `Now provide your final response in Markdown format using the data retrieved.

// Use this structure when data EXISTS:
// 1. ## 📋 [Main Topic] - focused on the data
// 2. Markdown tables for data
// 3. ## 📊 [Section Name] for breakdowns if applicable
// 4. ## 💡 Key Insights - patterns found in the data
// 5. ## ⚠️ Issues Found - data quality issues (use > for blockquotes)
// 6. ## 🎯 Recommendations - actionable suggestions
// 7. ## 📈 Summary - key metrics
// 8. ---

// Make it professional and data-focused. Include all relevant data from the tool results.`;
//       }

//       conversationHistory.push({
//         role: "user",
//         parts: [
//           {
//             text: finalPrompt,
//           },
//         ],
//       });

//       const finalChat = model.startChat({
//         history: conversationHistory,
//       });

//       const finalResult = await retryWithBackoff(() =>
//         finalChat.sendMessage("Generate the final response now."),
//       );

//       let markdownResponse = finalResult.response.text();

//       // If no data exists and the response contains markdown formatting, clean it up
//       if (!dataExists) {
//         // Remove any markdown formatting that might have slipped through
//         markdownResponse = markdownResponse
//           .replace(/^##\s.*$/gm, "") // Remove headings
//           .replace(/^\|.*\|$/gm, "") // Remove table rows
//           .replace(/^[-|:\s]+$/gm, "") // Remove table separators
//           .replace(/^\*.*\*$/gm, "") // Remove italic/bold
//           .replace(/^>.*$/gm, "") // Remove blockquotes
//           .replace(/^---$/gm, "") // Remove horizontal rules
//           .replace(/^[📋📊💡⚠️🎯📈]\s.*$/gm, "") // Remove emoji headings
//           .replace(/\n{3,}/g, "\n\n") // Remove excessive newlines
//           .trim();
//       }

//       const intent =
//         toolResults.length > 0
//           ? toolResults.map((t) => t.tool).join(", ")
//           : "none";

//       const entityRefs = {};
//       for (const result of toolResults) {
//         if (result.result && typeof result.result === "object") {
//           const idFields = [
//             "_id",
//             "productId",
//             "invoiceId",
//             "supplierId",
//             "categoryId",
//             "userId",
//             "organizationId",
//           ];
//           for (const field of idFields) {
//             if (result.result[field]) {
//               entityRefs[field] = result.result[field];
//             }
//           }
//           if (result.result.product && result.result.product._id) {
//             entityRefs.productId = result.result.product._id;
//           }
//           if (result.result.supplier && result.result.supplier._id) {
//             entityRefs.supplierId = result.result.supplier._id;
//           }
//         }
//       }

//       return {
//         markdown: markdownResponse,
//         intent: intent,
//         entityRefs: Object.keys(entityRefs).length > 0 ? entityRefs : null,
//       };
//     } catch (error) {
//       console.error("Error in final response:", error);
//       return {
//         markdown: `❌ **Error**: ${error.message || "I encountered an error generating the final response. Please try again."}`,
//         intent: "error",
//         entityRefs: null,
//       };
//     }
//   }
// }
