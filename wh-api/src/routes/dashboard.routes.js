import { Router } from "express";
import { dashboardController } from "../controllers/dashboard.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.use(authenticate);

router.get("/", dashboardController.getDashboardData);

router.get("/summary", dashboardController.getQuickSummary);

export default router;
