import { RenderedConversationMessage } from './chat'
import { RenderContext } from './context'

/**
 * This can be extended using declare module to add additional providers.
 */
export interface ChatCompletionRequestPayloads { }

export interface LogChatCompletionRequest<
  R extends Record<
    string,
    any
  > = ChatCompletionRequestPayloads[keyof ChatCompletionRequestPayloads]
> {
  startTime: number
  model: string
  providerRegion?: string
  provider?: string
  inputMessages: RenderedConversationMessage[]
  request: R
}

export interface LogChatCompletionResponse<
  R extends Record<
    string,
    any
  > = ChatCompletionRequestPayloads[keyof ChatCompletionRequestPayloads]
> extends LogChatCompletionRequest<R> {
  latency: number
  outputMessage: RenderedConversationMessage
  finishReason: string
  tokensUsed: {
    prompt: number
    completion: number
    total: number
  }
}

export type LogLevel = 'error' | 'warn' | 'info' | 'debug'

type Loggable = string | number | boolean | undefined | null | object

export type Logger = {
  error: (...msg: Loggable[]) => void
  warn: (...msg: Loggable[]) => void
  info: (...msg: Loggable[]) => void
  debug: (...msg: Loggable[]) => void
  logException: (exception: unknown) => void

  // custom event things
  chatCompletionRequest: <K extends keyof ChatCompletionRequestPayloads>(
    provider: K,
    payload: LogChatCompletionRequest<ChatCompletionRequestPayloads[K]>
  ) => void

  chatCompletionResponse: <K extends keyof ChatCompletionRequestPayloads>(
    provider: K,
    payload: LogChatCompletionResponse<ChatCompletionRequestPayloads[K]>
  ) => void
}

export abstract class LogImplementation {
  protected readonly loggedExceptions = new WeakMap<object, boolean>()

  /**
   * @param ctx The current RenderContext
   * @param level The log level, e.g. 'error', 'warn', 'info', 'debug'
   * @param message
   */
  abstract log(ctx: RenderContext, level: LogLevel, message: string): void

  /**
   * Logs exceptions thrown during an element's render.
   */
  logException(ctx: RenderContext, exception: unknown) {
    if (typeof exception === 'object' && exception !== null) {
      if (this.loggedExceptions.has(exception)) {
        // has alread logged
        return
      }

      this.loggedExceptions.set(exception, true)
    }

    const elementTag = `<${ctx.element.tag.name}>`
    this.log(
      ctx,
      'error',
      `Rendering element ${elementTag} failed with exception: ${exception}`
    )
  }

  chatCompletionRequest<K extends keyof ChatCompletionRequestPayloads>(
    _ctx: RenderContext,
    _provider: K,
    _payload: LogChatCompletionRequest<ChatCompletionRequestPayloads[K]>
  ): void { }

  chatCompletionResponse<K extends keyof ChatCompletionRequestPayloads>(
    _ctx: RenderContext,
    _provider: K,
    _payload: LogChatCompletionResponse<ChatCompletionRequestPayloads[K]>
  ): void { }
}

export class BoundLogger implements Logger {
  constructor(
    private readonly impl: LogImplementation,
    private readonly ctx: RenderContext
  ) { }

  private formatMessage = (...msgs: Loggable[]) =>
    msgs
      .map((m) => {
        if (typeof m === 'string') {
          return m
        } else if (typeof m === 'number') {
          return m.toString()
        } else if (typeof m === 'boolean') {
          return m ? 'true' : 'false'
        } else if (m === undefined) {
          return 'undefined'
        } else if (m === null) {
          return 'null'
        } else {
          return JSON.stringify(m)
        }
      })
      .join(' ')

  error = (...msgs: Loggable[]) =>
    this.impl.log(this.ctx, 'error', this.formatMessage(...msgs))
  warn = (...msgs: Loggable[]) =>
    this.impl.log(this.ctx, 'warn', this.formatMessage(...msgs))
  info = (...msgs: Loggable[]) =>
    this.impl.log(this.ctx, 'info', this.formatMessage(...msgs))
  debug = (...msgs: Loggable[]) =>
    this.impl.log(this.ctx, 'debug', this.formatMessage(...msgs))

  logException = (exception: unknown) =>
    this.impl.logException(this.ctx, exception)

  chatCompletionRequest = <K extends keyof ChatCompletionRequestPayloads>(
    provider: K,
    payload: LogChatCompletionRequest<ChatCompletionRequestPayloads[K]>
  ) => {
    return this.impl.chatCompletionRequest(this.ctx, provider, payload)
  }

  chatCompletionResponse = <K extends keyof ChatCompletionRequestPayloads>(
    provider: K,
    payload: LogChatCompletionResponse<ChatCompletionRequestPayloads[K]>
  ) => {
    return this.impl.chatCompletionResponse(this.ctx, provider, payload)
  }
}

export class NoopLogImplementation extends LogImplementation {
  log(_ctx: RenderContext, _level: LogLevel, _message: string): void { }
}

export class ConsoleLogger extends LogImplementation {
  log(ctx: RenderContext, level: LogLevel, message: string): void {
    console.log(
      `[${level}] <${ctx.element.tag.name}> id=${ctx.renderId} ${message}`
    )
  }
}

export class CombinedLogger extends LogImplementation {
  constructor(private readonly loggers: LogImplementation[]) {
    super()
  }

  log(...args: Parameters<LogImplementation['log']>): void {
    this.loggers.forEach((l) => l.log(...args))
  }

  chatCompletionRequest<_K extends keyof ChatCompletionRequestPayloads>(
    ...args: Parameters<LogImplementation['chatCompletionRequest']>
  ): void {
    this.loggers.forEach((l) => l.chatCompletionRequest(...args))
  }

  chatCompletionResponse<_K extends keyof ChatCompletionRequestPayloads>(
    ...args: Parameters<LogImplementation['chatCompletionResponse']>
  ): void {
    this.loggers.forEach((l) => l.chatCompletionResponse(...args))
  }
}
