import app from "./app.js";
import { config } from "./config/env.js";
import { logServerStart } from "./middleware/logger.middleware.js";
import { startCronJobs } from "./services/cron.service.js";

const PORT = config.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  logServerStart(PORT);

  
  startCronJobs();
});
