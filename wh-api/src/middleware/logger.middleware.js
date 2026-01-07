import chalk from "chalk";
import os from "os";

const formatBytes = (bytes) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
};

const getStatusColor = (status) => {
  if (status >= 500) return chalk.red;
  if (status >= 400) return chalk.yellow;
  if (status >= 300) return chalk.cyan;
  if (status >= 200) return chalk.green;
  return chalk.white;
};

const getMethodColor = (method) => {
  const colors = {
    GET: chalk.blue,
    POST: chalk.green,
    PUT: chalk.yellow,
    PATCH: chalk.magenta,
    DELETE: chalk.red,
    OPTIONS: chalk.gray,
  };
  return colors[method] || chalk.white;
};

const formatResponseTime = (ms) => {
  if (ms < 100) return chalk.green(`${ms}ms`);
  if (ms < 500) return chalk.yellow(`${ms}ms`);
  return chalk.red(`${ms}ms`);
};

export const logger = (req, res, next) => {
  const startTime = Date.now();
  const timestamp = new Date().toLocaleTimeString();

  
  const originalEnd = res.end;

  
  res.end = function (chunk, encoding) {
    res.end = originalEnd;
    res.end(chunk, encoding);

    const responseTime = Date.now() - startTime;
    const statusColor = getStatusColor(res.statusCode);
    const methodColor = getMethodColor(req.method);

    
    const logParts = [
      chalk.gray(`[${timestamp}]`),
      methodColor.bold(req.method.padEnd(7)),
      statusColor.bold(res.statusCode.toString().padEnd(3)),
      chalk.white(req.originalUrl || req.url),
      chalk.gray("•"),
      formatResponseTime(responseTime),
    ];

    
    const contentLength = res.get("content-length");
    if (contentLength) {
      logParts.push(chalk.gray("•"));
      logParts.push(chalk.gray(formatBytes(parseInt(contentLength))));
    }

    
    if (req.user) {
      logParts.push(chalk.gray("•"));
      let userInfo = chalk.cyan(`👤 ${req.user.email}`);
      
      
      if (res.locals.ocraiAiCount !== undefined || res.locals.ocraiDuplicateCount !== undefined) {
        const aiCount = res.locals.ocraiAiCount || 0;
        const dupCount = res.locals.ocraiDuplicateCount || 0;
        
        if (aiCount > 0) {
          userInfo += ` 🤖 - ${aiCount}`;
        }
        if (dupCount > 0) {
          userInfo += ` 💾 - ${dupCount}`;
        }
      } 
      
      else if (res.locals.ocraiType === "ai") {
        userInfo += " 🤖"; 
      } else if (res.locals.ocraiType === "duplicate") {
        userInfo += " 💾"; 
      }
      
      logParts.push(userInfo);
    }

    
    if (res.statusCode >= 400 && res.locals.errorMessage) {
    }
  };

  next();
};

const getLocalIPAddress = () => {
  const interfaces = os.networkInterfaces();
  
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  
  return null;
};

export const logServerStart = (port) => {
  const localIP = getLocalIPAddress();
  
  
  if (localIP) {
  }
  
};

export const requestLogger = (req, res, next) => {
  if (req.body && Object.keys(req.body).length > 0) {
    
    const sanitizedBody = { ...req.body };
    if (sanitizedBody.password) sanitizedBody.password = "***";
    if (sanitizedBody.refreshToken) sanitizedBody.refreshToken = "***";
    
  }
  next();
};

