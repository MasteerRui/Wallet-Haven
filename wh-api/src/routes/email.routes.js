import { Router } from "express";
import { emailController } from "../controllers/email.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/test", emailController.testEmail);

router.post("/send-custom", authenticate, emailController.sendCustomEmail);

export default router;

