// jobs/reorderSuggestion.cron.js
import cron from "node-cron";
import { generateReorderSuggestionsForAllOrgs } from "../services/reorderSuggestion.service.js";

export const scheduleReorderSuggestionJob = () => {
  // Runs at 1:30 AM — 30 min after forecast job (1:00 AM), so fresh forecasts exist
  cron.schedule("30 1 * * *", async () => {
    console.log("Running nightly reorder suggestion job...");
    try {
      await generateReorderSuggestionsForAllOrgs();
      console.log("Reorder suggestion job completed successfully");
    } catch (error) {
      console.error("Reorder suggestion job failed:", error.message);
    }
  });
};
