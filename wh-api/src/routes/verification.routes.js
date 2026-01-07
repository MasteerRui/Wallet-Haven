import { Router } from "express";
import { verificationController } from "../controllers/verification.controller.js";

const router = Router();

router.post("/send-code", verificationController.sendVerificationCode);
router.post("/verify-code", verificationController.verifyCode);
router.post("/resend-code", verificationController.resendCode);

export default router;

