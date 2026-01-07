import { Router } from "express";
import { authController } from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/signup", authController.signUp);
router.post("/signin", authController.signIn);
router.post("/signout", authController.signOut);
router.post("/refresh", authController.refreshSession);
router.post("/clear-google-session", authController.clearGoogleSession);

router.get("/google/url", authController.getGoogleAuthUrl);
router.get("/google/callback", authController.handleGoogleCallback);
router.post("/google/signin", authController.signInWithGoogle);

router.get("/user", authenticate, authController.getUser);

export default router;

