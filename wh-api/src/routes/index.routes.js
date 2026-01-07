import { Router } from "express";

const router = Router();

router.get("/", (req, res) => {
  res.status(200).json({
    message: "Wallethaven API",
    version: "1.0.0",
    endpoints: {
      auth: "/api/auth",
      verification: "/api/verification",
      email: "/api/email",
    },
  });
});

export default router;

