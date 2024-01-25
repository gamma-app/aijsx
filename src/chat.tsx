import { LogChatCompletionRequest } from './log'
import { AIComponent, AIElement, AINode, PropsOfAIComponent } from './types'

type ChatCompletionRole = 'user' | 'system' | 'assistant'

export const SystemMessage = (props: { children: AINode }) => {
  return props.children
}

export const UserMessage = (props: { children: AINode }) => {
  return props.children
}

export const AssistantMessage = (props: { children: AINode }) => {
  return props.children
}

// TODO maybe call these ChatMessage?
interface ConversationMessageType<
  T extends ChatCompletionRole,
  C extends AIComponent<any>
> {
  type: T
  element: AIElement<PropsOfAIComponent<C>>
}

export type ConversationMessage =
  | ConversationMessageType<'user', typeof UserMessage>
  | ConversationMessageType<'assistant', typeof AssistantMessage>
  | ConversationMessageType<'system', typeof SystemMessage>

export type RenderedConversationMessage = ConversationMessage & {
  content: string
  tokens: number
}

export const childrenToConversationMessage = (
  c: AIElement<any> | AIElement<any>[]
): ConversationMessage[] => {
  const children = Array.isArray(c) ? c : [c]

  return children.map((child) => {
    if (child.tag.name === 'UserMessage') {
      return {
        type: 'user',
        element: child,
      }
    } else if (child.tag.name === 'SystemMessage') {
      return {
        type: 'system',
        element: child,
      }
    } else if (child.tag.name === 'AssistantMessage') {
      return {
        type: 'assistant',
        element: child,
      }
    } else {
      throw new Error('OpenAI: unknown message type')
    }
  })
}

export const computeUsage = (messages: RenderedConversationMessage[]) => {
  const prompt = messages
    .filter((m) => m.type === 'user' || m.type === 'system')
    .reduce((acc, m) => acc + m.tokens, 0)
  const completion = messages
    .filter((m) => m.type === 'assistant')
    .reduce((acc, m) => acc + m.tokens, 0)

  return {
    prompt,
    completion,
    total: prompt + completion,
  }
}

export class ChatCompletionError extends Error {
  constructor(
    message: string,
    public readonly chatCompletionRequest: LogChatCompletionRequest
  ) {
    super(message)
  }
}
