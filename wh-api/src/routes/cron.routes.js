import { Router } from "express";
import { cronService } from "../services/cron.service.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/status", async (req, res) => {
  try {
    const status = cronService.getJobsStatus();

    res.json({
      success: true,
      data: {
        jobs: status,
        serverTime: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Get cron status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get cron jobs status",
      error: error.message,
    });
  }
});

router.post("/trigger-recurrences", authenticate, async (req, res) => {
  try {

    const result = await cronService.triggerRecurrenceProcessing();

    res.json({
      success: true,
      message: `Manually processed ${result.processed} recurrences with ${result.errors} errors`,
      data: result,
    });
  } catch (error) {
    console.error("Manual trigger recurrences error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to trigger recurrence processing",
      error: error.message,
    });
  }
});

router.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Cron service is running",
    timestamp: new Date().toISOString(),
  });
});

export default router;
