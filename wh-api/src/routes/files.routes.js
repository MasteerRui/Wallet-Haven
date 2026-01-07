import express from "express";
import { filesController } from "../controllers/files.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(authenticate);

router.post(
  "/upload",
  filesController.uploadMiddleware,
  filesController.uploadFile
);

router.get("/:id", filesController.getFile);

router.delete("/:id", filesController.deleteFile);

export default router;
