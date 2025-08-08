import winston from 'winston';

// Get log level from environment or default to 'info'
const logLevel = process.env.LOG_LEVEL || 'info';

// Create the logger instance with JSON format
const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'steam-auth-proxy' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    })
  ]
});

// For development, use a more readable format if LOG_FORMAT is set to 'pretty'
if (process.env.LOG_FORMAT === 'pretty' && process.env.NODE_ENV !== 'production') {
  logger.clear();
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({ format: 'HH:mm:ss' }),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        let msg = `${timestamp} ${level}: ${message}`;
        if (Object.keys(meta).length > 1) { // >1 because 'service' is always there
          const { service, ...rest } = meta;
          if (Object.keys(rest).length > 0) {
            msg += ` ${JSON.stringify(rest, null, 2)}`;
          }
        }
        return msg;
      })
    )
  }));
}

export default logger;