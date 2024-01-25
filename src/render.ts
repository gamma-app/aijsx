import { StreamRenderContext, LoggerContext, RenderContext } from './context'
import { createAIElement } from './createElement'
import { LogImplementation, NoopLogImplementation } from './log'
import { Literal } from './types'
import { uuidv4 } from './utils'

export function renderLiteral(renderable: Literal): string {
  if (typeof renderable === 'string') {
    return renderable
  }
  if (typeof renderable === 'number') {
    return renderable.toString()
  }

  if (
    typeof renderable === 'undefined' ||
    typeof renderable === 'boolean' ||
    renderable === null
  ) {
    return ''
  }

  // should not be reachable
  return ''
}

function Root() {
  return null
}

export function createRenderContext({
  logger = new NoopLogImplementation(),
  rootRenderId = uuidv4(),
}: {
  logger?: LogImplementation
  rootRenderId?: string
} = {}): RenderContext {
  return new StreamRenderContext(
    null,
    createAIElement(Root, {}),
    rootRenderId,
    {
      [LoggerContext.key]: logger || LoggerContext.defaultValue,
    }
  )
}
