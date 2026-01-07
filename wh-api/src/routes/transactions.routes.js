import { Router } from "express";
import { transactionsController } from "../controllers/transactions.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.use(authenticate);

router.post(
  "/",
  transactionsController.uploadMiddleware,
  transactionsController.createTransaction
);

router.post(
  "/transfer",
  transactionsController.uploadMiddleware,
  transactionsController.transferBetweenWallets
);

router.get("/", transactionsController.getUserTransactions);

router.get("/stats", transactionsController.getTransactionStats);

router.get("/:id", transactionsController.getTransactionById);

router.put("/:id", transactionsController.updateTransaction);

router.delete("/:id", transactionsController.deleteTransaction);

export default router;
