import { Router } from "express";
import testRoutes from "./test.routes.js";
import authRoutes from "./auth.routes.js";
import emailRoutes from "./email.routes.js";
import verificationRoutes from "./verification.routes.js";
import passwordResetRoutes from "./password-reset.routes.js";
import ocraiRoutes from "./ocrai.routes.js";
import transactionsRoutes from "./transactions.routes.js";
import walletsRoutes from "./wallets.routes.js";
import categoriesRoutes from "./categories.routes.js";
import dashboardRoutes from "./dashboard.routes.js";
import goalsRoutes from "./goals.routes.js";
import currencyRoutes from "./currency.routes.js";
import recurrencesRoutes from "./recurrences.routes.js";
import cronRoutes from "./cron.routes.js";
import userSettingsRoutes from "./user-settings.routes.js";
import filesRoutes from "./files.routes.js";

const router = Router();

router.use("/test", testRoutes);
router.use("/auth", authRoutes);
router.use("/email", emailRoutes);
router.use("/verification", verificationRoutes);
router.use("/password-reset", passwordResetRoutes);
router.use("/ocrai", ocraiRoutes);
router.use("/transactions", transactionsRoutes);
router.use("/wallets", walletsRoutes);
router.use("/categories", categoriesRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/goals", goalsRoutes);
router.use("/currency", currencyRoutes);
router.use("/recurrences", recurrencesRoutes);
router.use("/cron", cronRoutes);
router.use("/user/settings", userSettingsRoutes);
router.use("/files", filesRoutes);

export default router;
