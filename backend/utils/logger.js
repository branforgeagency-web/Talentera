const winston = require("winston");

/**
 * Shared structured logger, replacing scattered raw console.log/console.error
 * calls across routes. In production this emits JSON lines (so a log
 * aggregator can parse/filter/alert on them); in development it prints
 * colorized single-line output for readability. See
 * IMPROVEMENT_ROADMAP.md "No structured logging" for why this was added.
 */
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    process.env.NODE_ENV === "production"
      ? winston.format.json()
      : winston.format.combine(winston.format.colorize(), winston.format.simple())
  ),
  transports: [new winston.transports.Console()],
});

module.exports = logger;
