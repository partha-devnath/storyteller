import winston from "winston"
import type { Logger } from "./types"

const isProduction = process.env.NODE_ENV === "production"

const normalizeErrors = winston.format((info) => {
  for (const key of Object.keys(info)) {
    const value = info[key]
    if (value instanceof Error) {
      info[key] = {
        ...value,
        name: value.name,
        message: value.message,
        stack: value.stack,
      }
    }
  }
  return info
})

export function serverFormat(production = false): winston.Logform.Format {
  return production
    ? winston.format.combine(normalizeErrors(), winston.format.json())
    : winston.format.combine(
        normalizeErrors(),
        winston.format.colorize({ all: true }),
        winston.format.timestamp({ format: "HH:mm:ss" }),
        winston.format.errors({ stack: true }),
        winston.format.printf(
          ({ timestamp, level, message, service, stack, ...meta }) => {
            const metaStr = Object.keys(meta).length
              ? ` ${JSON.stringify(meta)}`
              : ""
            const stackStr = stack ? `\n${stack}` : ""
            return `${timestamp} ${level} [${service}] ${message}${metaStr}${stackStr}`
          }
        )
      )
}

function createWinstonLogger(name: string): winston.Logger {
  return winston.createLogger({
    level: process.env.LOG_LEVEL ?? "info",
    defaultMeta: { service: name },
    format: serverFormat(isProduction),
    transports: [new winston.transports.Console()],
  })
}

export function createLogger(name: string): Logger {
  const logger = createWinstonLogger(name)

  return {
    info(objOrMsg, msg) {
      if (typeof objOrMsg === "string") logger.info(objOrMsg)
      else logger.info(msg ?? "", objOrMsg)
    },
    warn(objOrMsg, msg) {
      if (typeof objOrMsg === "string") logger.warn(objOrMsg)
      else logger.warn(msg ?? "", objOrMsg)
    },
    error(objOrMsg, msg) {
      if (objOrMsg instanceof Error) {
        logger.error(msg ?? objOrMsg.message, { err: objOrMsg })
      } else if (typeof objOrMsg === "string") {
        logger.error(objOrMsg)
      } else if (objOrMsg && typeof objOrMsg === "object") {
        logger.error(msg ?? "", objOrMsg)
      } else {
        logger.error(String(objOrMsg))
      }
    },
    debug(objOrMsg, msg) {
      if (typeof objOrMsg === "string") logger.debug(objOrMsg)
      else logger.debug(msg ?? "", objOrMsg)
    },
  }
}
