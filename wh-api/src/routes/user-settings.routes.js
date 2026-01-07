import { Router } from "express";
import { userSettingsController } from "../controllers/user-settings.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.use(authenticate);

router.get("/", userSettingsController.getUserSettings);

router.post("/pin", userSettingsController.setPin);
router.post("/pin/verify", userSettingsController.verifyPin);
router.delete("/pin", userSettingsController.removePin);

router.post("/biometric", userSettingsController.setBiometric);

router.patch("/preferences", userSettingsController.updatePreferences);

router.get("/profile", userSettingsController.getUserProfile);
router.patch("/profile", userSettingsController.updateUserProfile);

router.post("/password/change", userSettingsController.changePassword);

export default router;
