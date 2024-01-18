import * as winston from "winston";

const logger : winston.Logger = winston.createLogger({
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'socks.log' })
  ]
});

export { logger };