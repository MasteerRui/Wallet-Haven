
import chalk from "chalk";

export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  
  res.locals.errorMessage = message;

  
  if (process.env.NODE_ENV === "development" && err.stack) {
  }

  const errorResponse = {
    success: false,
    message,
  };

  
  if (process.env.NODE_ENV === "development") {
    errorResponse.stack = err.stack;
  }

  res.status(statusCode).json(errorResponse);
};
