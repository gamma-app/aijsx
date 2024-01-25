import { RenderContext } from './context'

export type Literal = string | number | null | undefined | boolean

export interface RenderableStream {
  [Symbol.asyncIterator]: () => AsyncGenerator<string, void, unknown>
}

export interface RenderResult extends RenderableStream {
  then: (
    onResolved: (value: string) => void,
    onRejected?: (reason?: any) => void
  ) => void
}

export interface Context<T> {
  Provider: AIComponent<{ children: AINode; value: T }>
  defaultValue: T
  key: symbol
}

export type AIComponent<P> = (props: P, context: RenderContext) => Renderable

export const attachedContextSymbol = Symbol('AI.attachedContext')

export interface AIElement<P> {
  /** The tag associated with this {@link AIElement}. */
  tag: AIComponent<P>
  /** The component properties. */
  props: P
  /** A function that renders this {@link AIElement} to a {@link Renderable}. */
  render: (ctx: RenderContext) => Renderable
  /** The {@link RenderContext} associated with this {@link Element}. */
  [attachedContextSymbol]?: Record<symbol, any>
}

export type AINode = Literal | AIElement<any> | AINode[]

export type Renderable = AINode | PromiseLike<Renderable> | RenderableStream

export type PropsOfAIComponent<T extends AIComponent<any>> =
  T extends AIComponent<infer P> ? P : never
