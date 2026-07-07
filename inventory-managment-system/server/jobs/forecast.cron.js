// jobs/forecast.cron.js
import cron from "node-cron";
import { generateForecastsForAllOrgs } from "../services/forecast.service.js";

export const scheduleForecastJob = () => {
  cron.schedule("0 1 * * *", async () => {
    console.log("Running nightly demand forecast job...");
    try {
      await generateForecastsForAllOrgs();
      console.log("Forecast job completed successfully");
    } catch (error) {
      console.error("Forecast job failed:", error.message);
    }
  });
};
