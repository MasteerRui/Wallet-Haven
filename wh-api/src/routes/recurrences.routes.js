import { Router } from "express";
import { recurrencesController } from "../controllers/recurrences.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.use(authenticate);

router.post("/", recurrencesController.createRecurrence);

router.get("/", recurrencesController.getRecurrences);

router.get("/upcoming", recurrencesController.getUpcomingTransactions);

router.get("/stats", recurrencesController.getRecurrenceStats);

router.get("/next-executions", recurrencesController.getNextExecutions);

router.get("/check-missing", recurrencesController.checkMissingTransactions);

router.post("/process", recurrencesController.processRecurrences);

router.get("/:id", recurrencesController.getRecurrence);

router.get("/:id/transactions", recurrencesController.getGeneratedTransactions);

router.post(
  "/:id/generate-missing",
  recurrencesController.generateMissingTransactions
);

router.put("/:id", recurrencesController.updateRecurrence);

router.patch("/:id/toggle", recurrencesController.toggleRecurrence);

router.delete("/:id", recurrencesController.deleteRecurrence);

export default router;
