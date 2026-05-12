import pino from 'pino'

export const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  ...(process.env.NODE_ENV !== 'production' && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize:    true,
        translateTime: 'HH:MM:ss',
        ignore:      'pid,hostname',
        messageFormat: '{msg}',
      },
    },
  }),
})

export type Logger = typeof logger
