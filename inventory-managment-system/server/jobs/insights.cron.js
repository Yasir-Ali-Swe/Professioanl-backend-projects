// jobs/insights.cron.js
import cron from "node-cron";
import { generateInsightsForAllOrgs } from "../services/insights.service.js";

export const scheduleInsightsJob = () => {
  cron.schedule("0 6 * * 1", async () => {
    console.log("Generating weekly AI insights...");
    try {
      await generateInsightsForAllOrgs("weekly");
      console.log("Weekly AI insights completed successfully");
    } catch (error) {
      console.error("Weekly AI insights failed:", error.message);
    }
  });

  cron.schedule("0 6 1 * *", async () => {
    console.log("Generating monthly AI insights...");
    try {
      await generateInsightsForAllOrgs("monthly");
      console.log("Monthly AI insights completed successfully");
    } catch (error) {
      console.error("Monthly AI insights failed:", error.message);
    }
  });
};
