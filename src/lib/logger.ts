/**
 * Système de logging structuré pour l'application
 * @module lib/logger
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  [key: string]: any
}

class Logger {
  private context: LogContext = {}

  /**
   * Crée une nouvelle instance de logger avec un contexte
   */
  child(context: LogContext): Logger {
    const child = new Logger()
    child.context = { ...this.context, ...context }
    return child
  }

  /**
   * Log un message de niveau debug
   */
  debug(message: string, context?: LogContext) {
    this.log('debug', message, context)
  }

  /**
   * Log un message de niveau info
   */
  info(message: string, context?: LogContext) {
    this.log('info', message, context)
  }

  /**
   * Log un message de niveau warning
   */
  warn(message: string, context?: LogContext) {
    this.log('warn', message, context)
  }

  /**
   * Log un message de niveau error
   */
  error(message: string, error?: Error | unknown, context?: LogContext) {
    const errorContext: LogContext = {}

    if (error instanceof Error) {
      errorContext.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      }
    } else if (error) {
      errorContext.error = error
    }

    this.log('error', message, { ...errorContext, ...context })
  }

  /**
   * Log interne
   */
  private log(level: LogLevel, message: string, context?: LogContext) {
    const timestamp = new Date().toISOString()
    const logData = {
      timestamp,
      level,
      message,
      ...this.context,
      ...context,
    }

    // En production, on pourrait envoyer vers un service de logging
    // (Sentry, LogTail, DataDog, etc.)
    if (level === 'error') {
      console.error(JSON.stringify(logData, null, 2))
    } else if (level === 'warn') {
      console.warn(JSON.stringify(logData, null, 2))
    } else if (process.env.NODE_ENV !== 'production' || level === 'info') {
      console.log(JSON.stringify(logData, null, 2))
    }
  }
}

/**
 * Instance globale du logger
 */
export const logger = new Logger()

/**
 * Logger spécialisé pour les paiements
 */
export const paymentLogger = logger.child({ module: 'payments' })

/**
 * Logger spécialisé pour les webhooks
 */
export const webhookLogger = logger.child({ module: 'webhooks' })
