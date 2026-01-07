import { Router } from "express";
import { goalsController } from "../controllers/goals.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.use(authenticate);

router.post("/", goalsController.createGoal);
router.get("/", goalsController.getGoals);
router.get("/:id", goalsController.getGoalById);
router.put("/:id", goalsController.updateGoal);
router.delete("/:id", goalsController.deleteGoal);

export default router;
