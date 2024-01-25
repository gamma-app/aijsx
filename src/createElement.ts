import { RenderContext } from './context'
import { AIComponent, AIElement, AINode, Renderable, Literal } from './types'

export function createAIElement<P extends { children: C }, C>(
  tag: AIComponent<P>,
  props: Omit<P, 'children'> | null,
  ...children: [C]
): AIElement<P>
export function createAIElement<P extends { children: C[] }, C>(
  tag: AIComponent<P>,
  props: Omit<P, 'children'> | null,
  ...children: C[]
): AIElement<P>
export function createAIElement<P extends { children: C | C[] }, C>(
  tag: AIComponent<P>,
  props: Omit<P, 'children'> | null,
  ...children: C[]
): AIElement<P> {
  const propsToPass = {
    ...(props ?? {}),
    ...(children.length === 0
      ? {}
      : { children: children.length === 1 ? children[0] : children }),
  } as P

  const result: AIElement<P> = {
    tag,
    props: propsToPass,
    render: (ctx: RenderContext) => {
      return tag(propsToPass, ctx)
    },
  }

  return result
}

export function isAIElement(value: unknown): value is AIElement<any> {
  return value !== null && typeof value === 'object' && 'tag' in value
}

export function isLiteral(value: unknown): value is Literal {
  return (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'undefined' ||
    typeof value === 'boolean' ||
    // capture null + undefined
    value == null
  )
}

export function AIFragment({ children }: { children: AINode }): Renderable {
  return children
}
