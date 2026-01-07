import express from "express";
import { passwordResetController } from "../controllers/password-reset.controller.js";

const router = express.Router();

router.post("/request", passwordResetController.requestPasswordReset);

router.post("/verify-code", passwordResetController.verifyResetCode);

router.post("/reset", passwordResetController.resetPassword);

export default router;

