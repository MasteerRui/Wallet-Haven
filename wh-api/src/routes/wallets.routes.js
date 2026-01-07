import { Router } from "express";
import { walletsController } from "../controllers/wallets.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/currencies", walletsController.getSupportedCurrencies);

router.use(authenticate);

router.get("/", walletsController.getUserWallets);

router.post("/", walletsController.createWallet);

router.get("/:id", walletsController.getWalletById);

router.put("/:id", walletsController.updateWallet);

router.delete("/:id", walletsController.deleteWallet);

router.post("/:id/restore", walletsController.restoreWallet);

router.get("/:id/balance", walletsController.getWalletBalance);

export default router;
