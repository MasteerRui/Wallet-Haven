import cron from "node-cron";
import { recurrenceService } from "./recurrence.service.js";
import { config } from "../config/env.js";

export const cronService = {
  
  startJobs: () => {

    
    cron.schedule(
      "*/1 * * * *",
      async () => {

        try {
          const result = await recurrenceService.processRecurrences();

          if (result.success) {
          } else {
            console.error("❌ Recurrence processing failed:", result.error);
          }
        } catch (error) {
          console.error("❌ Critical error in recurrence cron job:", error);
        }
      },
      {
        scheduled: true,
        timezone: "UTC", 
      }
    );

    
    cron.schedule(
      "0 2 * * *",
      async () => {

        try {
          
          
          
          
        } catch (error) {
          console.error("❌ Error in daily validation check:", error);
        }
      },
      {
        scheduled: true,
        timezone: "UTC",
      }
    );

    
    cron.schedule("0 3 * * 0", async () => {

      try {
        
        
      } catch (error) {
        console.error("❌ Error in database cleanup:", error);
      }
    });

  },

  
  stopJobs: () => {
    cron.getTasks().forEach((task, name) => {
      task.stop();
    });
  },

  
  getJobsStatus: () => {
    const tasks = cron.getTasks();
    const status = [];

    tasks.forEach((task, name) => {
      status.push({
        name: name,
        running: task.getStatus() === "scheduled",
        nextExecution: task.nextDate ? task.nextDate().toISOString() : null,
      });
    });

    return status;
  },

  
  triggerRecurrenceProcessing: async () => {

    try {
      const result = await recurrenceService.processRecurrences();
      return result;
    } catch (error) {
      console.error("❌ Error in manual recurrence processing:", error);
      throw error;
    }
  },
};

export const startCronJobs = cronService.startJobs;
export const stopCronJobs = cronService.stopJobs;
