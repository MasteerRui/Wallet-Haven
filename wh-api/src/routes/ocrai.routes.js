import { Router } from "express";
import {
  processImage,
  submitImage,
  getResult,
  pollResult,
  getCredit,
  getSupportedRegions,
  healthCheck,
  batchProcessOcraiResults,
  createTransactionsFromOcrai,
  deleteOcraiResult,
  getPendingOcraiResults,
  getOcraiResults,
  getOcraiResultById,
  testRawResponse,
} from "../controllers/ocrai.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/health", healthCheck);

router.get("/regions", getSupportedRegions);

router.use(authenticate);

router.post("/process", processImage);

router.post("/submit", submitImage);
router.get("/result/:token", getResult);
router.get("/poll/:token", pollResult);

router.get("/credit", getCredit);

router.post("/batch-process", batchProcessOcraiResults);
router.post("/create-transactions", createTransactionsFromOcrai);
router.delete("/results/:id", deleteOcraiResult);
router.get("/pending", getPendingOcraiResults);
router.get("/results", getOcraiResults);
router.get("/results/:id", getOcraiResultById);

router.post("/test", testRawResponse);

export default router;
