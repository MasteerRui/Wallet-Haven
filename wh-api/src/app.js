import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import routes from "./routes/index.js";
import rootRoutes from "./routes/index.routes.js";
import { errorHandler } from "./middleware/error.middleware.js";
import { logger } from "./middleware/logger.middleware.js";

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.use("/uploads", express.static("uploads"));

app.use(logger);

app.use("/", rootRoutes);

app.use("/api", routes);

app.use(errorHandler);

export default app;
