import type { Logger } from "./types"

const styles = {
  info: { badge: "#1d4ed8", text: "#93c5fd" },
  warn: { badge: "#a16207", text: "#fde047" },
  error: { badge: "#b91c1c", text: "#fca5a5" },
  debug: { badge: "#4a044e", text: "#d8b4fe" },
} as const

type Level = keyof typeof styles

function colorHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  const h = Math.abs(hash) % 360
  return `hsl(${h}, 65%, 55%)`
}

function badgeStyle(level: Level, nameColor: string): [string, string, string] {
  const s = styles[level]
  return [
    `%c ${level.toUpperCase()} %c %c `,
    `background:${s.badge};color:#fff;border-radius:3px 0 0 3px;padding:1px 4px;font-weight:bold`,
    `background:${nameColor};color:#fff;border-radius:0 3px 3px 0;padding:1px 5px`,
  ]
}

export function createLogger(name: string): Logger {
  const nameColor = colorHash(name)

  function write(level: Level, args: unknown[]) {
    const [fmt, style1, style2] = badgeStyle(level, nameColor)
    switch (level) {
      case "info":
        console.info(fmt, style1, style2, ...args)
        break
      case "warn":
        console.warn(fmt, style1, style2, ...args)
        break
      case "error":
        console.error(fmt, style1, style2, ...args)
        break
      case "debug":
        console.debug(fmt, style1, style2, ...args)
        break
    }
  }

  function log(level: Level, objOrMsg: unknown, msg?: string) {
    if (typeof objOrMsg === "string") {
      write(level, [objOrMsg, ...(msg ? [msg] : [])])
    } else if (objOrMsg instanceof Error) {
      write(level, [msg ?? objOrMsg.message, objOrMsg])
    } else if (objOrMsg && typeof objOrMsg === "object") {
      write(level, [msg ?? "", objOrMsg])
    } else {
      write(level, [String(objOrMsg)])
    }
  }

  return {
    info(objOrMsg, msg) {
      log("info", objOrMsg, msg)
    },
    warn(objOrMsg, msg) {
      log("warn", objOrMsg, msg)
    },
    error(objOrMsg, msg) {
      log("error", objOrMsg, msg)
    },
    debug(objOrMsg, msg) {
      log("debug", objOrMsg, msg)
    },
  }
}
