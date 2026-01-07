import { Router } from "express";
import { categoriesController } from "../controllers/categories.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/initialize", categoriesController.initializeGlobalCategories);

router.get("/global", categoriesController.getGlobalCategories);

router.use(authenticate);

router.get("/", categoriesController.getUserCategories);

router.post("/", categoriesController.createCategory);

router.put("/:id", categoriesController.updateCategory);

router.delete("/:id", categoriesController.deleteCategory);

router.post("/:id/restore", categoriesController.restoreCategory);

export default router;
