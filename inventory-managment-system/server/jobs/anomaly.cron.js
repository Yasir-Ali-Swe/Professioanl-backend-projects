// jobs/anomaly.cron.js
import cron from "node-cron";
import { runAnomalyDetectionForAllOrgs } from "../services/anomaly.service.js";

export const scheduleAnomalyJob = () => {
  cron.schedule("0 2 * * *", async () => {
    console.log("Running nightly anomaly detection job...");
    try {
      await runAnomalyDetectionForAllOrgs();
      console.log("Anomaly detection job completed successfully");
    } catch (error) {
      console.error("Anomaly detection job failed:", error.message);
    }
  });
};
