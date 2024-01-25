import { createAIElement, isAIElement, isLiteral } from './createElement'
import { EventEmitter } from './EventEmitter'
import {
  BoundLogger,
  LogImplementation,
  Logger,
  NoopLogImplementation,
} from './log'
import { renderLiteral } from './render'
import {
  AIElement,
  AINode,
  Context,
  Literal,
  RenderResult,
  Renderable,
  attachedContextSymbol,
} from './types'
import { uuidv4 } from './utils'

export const LoggerContext = createContext<LogImplementation>(
  new NoopLogImplementation()
)

type ContextValues = Record<symbol, any>

export interface RenderContext {
  parentContext: RenderContext | null

  element: AIElement<any>

  renderId: string

  logger: Logger

  getContext<T>(context: Context<T>): T

  render(renderable: Renderable): RenderResult
}

const accumResults = async (
  result: AsyncGenerator<string, any>
): Promise<string> => {
  let accum = ''
  const iterator = result[Symbol.asyncIterator]()
  for await (const value of iterator) {
    accum += value
  }
  return accum
}

// create at AsyncIterator<string,string,unknown> for a fixed
// size array of strings (size n)
class ParallelStreamIterator
  extends EventEmitter<{
    data: { streamInd: number; valInd: number; value: string }
    complete: { streamInd: number }
  }>
  implements AsyncIterable<string>
{
  private values: string[][] = []

  private completedStreams: boolean[] = []

  private cursor: [number, number] = [0, 0]

  constructor(size: number) {
    super()
    for (let i = 0; i < size; i++) {
      this.values[i] = []
      this.completedStreams[i] = false
    }
  }

  push(streamInd: number, value: string) {
    const valInd = this.values[streamInd].length
    this.values[streamInd].push(value)
    this.emit('data', {
      streamInd,
      valInd,
      value,
    })
  }

  complete(streamInd: number) {
    this.completedStreams[streamInd] = true
    this.emit('complete', {
      streamInd,
    })
  }

  nextCursor(complete: boolean): void {
    const [streamInd, valInd] = this.cursor
    // console.log('next cursor', complete ? 'stream' : 'ind')

    if (!complete) {
      this.cursor = [streamInd, valInd + 1]
    } else {
      this.cursor = [streamInd + 1, 0]
    }
  }

  // returns a promise that resolves when this.values[streamInd][valInd] is available
  private resolveAt(
    streamInd: number,
    valInd: number
  ): Promise<IteratorResult<string, void>> {
    return new Promise((resolve, reject) => {
      const value = this.values[streamInd][valInd]
      if (value !== undefined) {
        resolve({ done: false, value })
        return
      }

      if (this.completedStreams[streamInd]) {
        if (streamInd === this.completedStreams.length - 1) {
          resolve({ done: true, value: undefined })
        }
        reject('next')
        return
      }

      const unsub = this.on('data', (data) => {
        if (streamInd === data.streamInd && data.valInd === valInd) {
          resolve({ done: false, value: data.value })
          unsub()
          onCompleteUnsub()
        }
      })

      const onCompleteUnsub = this.on('complete', (data) => {
        if (streamInd !== data.streamInd) {
          return
        }
        // the last stream is complete
        if (streamInd === this.completedStreams.length - 1) {
          // is the last stream
          resolve({ done: true, value: undefined })
        }

        // stream was complete, signal to move to next stream
        if (this.values[streamInd].length === valInd) {
          reject('next')
        }

        unsub()
        onCompleteUnsub()
      })
    })
  }

  async next(): Promise<IteratorResult<string, void>> {
    try {
      const val = await this.resolveAt(...this.cursor)
      this.nextCursor(false)
      return val
    } catch (e) {
      if (e !== 'next') {
        throw e
      }

      // cursor [streamIndex, valueIndex] of this.values[][]
      // cursor [2, 10]
      // cursor [3, 0]
      this.nextCursor(true)
      const nextStreamVal = await this.resolveAt(...this.cursor)
      this.nextCursor(false)
      return nextStreamVal
    }
  }

  [Symbol.asyncIterator](): AsyncIterator<string, void> {
    return this
  }
}

export function coalesceParallelStreams(
  streams: AsyncGenerator<string, void>[]
): AsyncIterator<string, void> {
  const iter = new ParallelStreamIterator(streams.length)

  // console.log('STREAMS', streams)
  streams.forEach(async (s, streamInd) => {
    for await (const value of s) {
      iter.push(streamInd, value)
    }
    iter.complete(streamInd)
  })

  return iter
}

export class StreamRenderContext<O extends ContextValues = ContextValues>
  implements RenderContext
{
  public readonly render: (renderable: Renderable) => RenderResult

  protected readonly renderStream: (
    renderable: Renderable
  ) => AsyncGenerator<string, void>

  public readonly logger: Logger

  constructor(
    public readonly parentContext: RenderContext | null,
    public readonly element: AIElement<any>,
    public readonly renderId: string,
    protected readonly contextValues: O
  ) {
    const logImpl = this.getContext(LoggerContext)
    this.logger = new BoundLogger(logImpl, this)

    this.render = (renderable: Renderable): RenderResult => {
      const generator = this.renderStream(renderable)

      const result: RenderResult = {
        then: (onFulfilled, onRejected) =>
          accumResults(generator).then(onFulfilled, onRejected),
        [Symbol.asyncIterator]: () => generator,
      }
      return result
    }
    const self = this

    this.renderStream = async function* (
      renderable: Renderable
    ): AsyncGenerator<string, void> {
      if (isLiteral(renderable)) {
        yield renderLiteral(renderable)
        return
      }

      if (isAIElement(renderable)) {
        const ctxValues = attachedContextValues(renderable) || {}

        const childRenderId = uuidv4()
        const newCtx = self.enter(renderable, childRenderId, ctxValues)
        const logger = newCtx.logger
        try {
          return yield* newCtx.render(renderable.render(newCtx))
        } catch (ex) {
          logger.logException(ex)
          throw ex
        }
      }

      if (Array.isArray(renderable)) {
        if (renderable.every((r) => isLiteral(r))) {
          // if all elements are literals, we can render them all at once
          // saving creation of a bunch of Stream objects and forcing
          // nextTick things with promises / async generators
          yield renderable.map((r) => renderLiteral(r as Literal)).join('')
          return
        }
        // [
        //   literal
        //   literal
        //   AsyncComp
        //   GeneratorComp
        //   literal
        // ]
        // [
        //   Generator
        //   Generator
        //   Generator
        //   Generator
        //   Generator
        // ]
        const streams = renderable
          // NOTE(jordan): filter out undefined values, since multiple falsy values will cause
          // the parallel stream renderer to throw multiple reject('next') in
          // a row and that's not supported currently
          .filter((a) => !!a)
          .map((r) => self.renderStream(r))
        const result = coalesceParallelStreams(streams)

        while (true) {
          const { value, done } = await result.next()

          if (done) {
            return
          }
          yield value
        }
      }

      if (Symbol.asyncIterator in renderable) {
        // if we're rendering an AsyncIteratable already, just yield to parent
        return yield* renderable[Symbol.asyncIterator]()
      }

      if (!('then' in renderable)) {
        throw new Error(
          `Unexpected renderable type: ${JSON.stringify(renderable)}`
        )
      }

      const next = await renderable.then(
        (r) => r as Exclude<Renderable, PromiseLike<Renderable>>
      )
      return yield* self.render(next)
    }
  }

  getContext = <T>(context: Context<T>): T => {
    return this.contextValues[context.key] ?? context.defaultValue
  }

  // @internal
  protected enter(
    element: AIElement<any>,
    renderId: string,
    newCtx: Record<symbol, any>
  ): StreamRenderContext {
    return new StreamRenderContext(this, element, renderId, {
      ...this.contextValues,
      ...newCtx,
    })
  }
}

function ContextValueProvider({ children }) {
  return children
}

export function createContext<T>(defaultValue: T): Context<T> {
  const key = Symbol()
  return {
    Provider: function ContextProvider(
      props: { value: T; children: AINode },
      _compContext: RenderContext
    ) {
      // the Provider component wraps the children in a fragment
      // that switches some context [key] with a different [value]
      const additionalContext = {
        [key]: props.value,
      }
      return withContextValues(
        createAIElement(ContextValueProvider, null, props.children),
        additionalContext
      )
    },
    defaultValue,
    key,
  }
}

function BoundContextValues({ children }) {
  return children
}

export function withContextValues<P>(
  element: AIElement<P>,
  additionalContext: ContextValues
): AIElement<P>
export function withContextValues(
  renderable: Renderable,
  additionalContext: ContextValues
): AINode
export function withContextValues(
  renderable: Renderable,
  additionalContext: ContextValues
): AINode {
  if (isLiteral(renderable)) {
    // Switching contexts isn't meaningful for scalars.
    return renderable
  }

  if (Array.isArray(renderable)) {
    return renderable.map((node) => withContextValues(node, additionalContext))
  }

  if (isAIElement(renderable)) {
    if (renderable[attachedContextSymbol]) {
      // It's already been bound to a context; don't replace it.
      return renderable
    }

    const elementWithContext: AIElement<any> = {
      ...renderable,
      [attachedContextSymbol]: additionalContext,
    }
    return elementWithContext
  }

  // it's either a promise like or an async iterator
  // Wrap it in an element and bind to that.
  return withContextValues(
    createAIElement(BoundContextValues, null, renderable),
    additionalContext
  )
}

export function attachedContextValues(
  element: AIElement<any>
): ContextValues | undefined {
  return element[attachedContextSymbol]
}
