import AnthropicClient from '@anthropic-ai/sdk'
import { Stream } from '@anthropic-ai/sdk/streaming'
import { countTokens } from '@anthropic-ai/tokenizer'

import {
  AssistantMessage,
  ChatCompletionError,
  ConversationMessage,
  RenderedConversationMessage,
  UserMessage,
  childrenToConversationMessage,
  computeUsage,
} from '../../chat'
import { RenderContext, createContext } from '../../context'
import { LogChatCompletionRequest, LogChatCompletionResponse } from '../../log'
import { AIElement } from '../../types'
import { getEnvVar } from '../../utils'

export type AnthropicChatCompletionRequest =
  AnthropicClient.CompletionCreateParams

// extend the chat completion request payloads for log messages
declare module '@gammatech/aijsx' {
  interface ChatCompletionRequestPayloads {
    anthropic: AnthropicChatCompletionRequest
  }
}

/**
 * The set of valid Claude models.
 * @see https://docs.anthropic.com/claude/reference/selecting-a-model
 */
export type ValidAnthropicChatModel = 'claude-instant-1.2' | 'claude-2.1'

// memoize default client
let defaultClient: AnthropicClient | null = null

export const AnthropicClientContext = createContext<() => AnthropicClient>(
  () => {
    if (defaultClient) {
      return defaultClient
    }

    defaultClient = new AnthropicClient({
      apiKey: getEnvVar('ANTHROPIC_API_KEY', false),
    })
    return defaultClient
  }
)

/**
 * If you use an Anthropic model without specifying the max tokens for the completion, this value will be used as the default.
 */
export const defaultMaxTokens = 4096

type AnthropicChatCompletionProps = {
  model: ValidAnthropicChatModel
  maxTokens?: number
  temperature?: number
  children: AIElement<any> | AIElement<any>[]
  // for tracking purposes
  provider?: string
  providerRegion?: string
}

/**
 * An AI.JSX component that invokes an Anthropic Large Language Model.
 * @param children The children to render.
 * @param chatModel The chat model to use.
 * @param completionModel The completion model to use.
 * @param client The Anthropic client.
 */
export async function* AnthropicChatCompletion(
  props: AnthropicChatCompletionProps,
  { render, logger, getContext }: RenderContext
) {
  const startTime = performance.now()

  const client = getContext(AnthropicClientContext)()
  if (!client) {
    throw new Error(
      '[AnthropicChatCompletion] must supply AnthropicClient via context'
    )
  }

  const renderedMessages = await Promise.all(
    childrenToConversationMessage(props.children)
      .flatMap<Exclude<ConversationMessage, { type: 'system' }>>((message) => {
        if (message.type === 'system') {
          return [
            {
              type: 'user',
              element: (
                <UserMessage>
                  For subsequent replies you will adhere to the following
                  instructions: {message.element}
                </UserMessage>
              ),
            },
            {
              type: 'assistant',
              element: (
                <AssistantMessage>Okay, I will do that.</AssistantMessage>
              ),
            },
          ]
        }

        return [message]
      })
      .map<Promise<RenderedConversationMessage>>(async (message) => {
        const prefix =
          message.type === 'user'
            ? AnthropicClient.HUMAN_PROMPT
            : AnthropicClient.AI_PROMPT
        const rendered = await render(message.element)
        const content = `${prefix} ${rendered.trim()}`

        return {
          ...message,
          content,
          tokens: countTokens(content),
        }
      })
  )

  const chatMessages = renderedMessages.map<string>((m) => {
    return m.content
  })

  chatMessages.push(AnthropicClient.AI_PROMPT)

  const anthropicCompletionRequest: AnthropicChatCompletionRequest = {
    prompt: chatMessages.join('\n\n'),
    max_tokens_to_sample: props.maxTokens ?? defaultMaxTokens,
    temperature: props.temperature,
    model: props.model,
    stream: true,
  }

  const logRequestData: LogChatCompletionRequest<AnthropicChatCompletionRequest> =
    {
      startTime,
      model: props.model,
      provider: props.provider,
      providerRegion: props.providerRegion,
      inputMessages: renderedMessages,
      request: anthropicCompletionRequest,
    }
  logger.chatCompletionRequest('anthropic', logRequestData)

  let response: Stream<AnthropicClient.Completions.Completion>
  try {
    response = await client.completions.create(anthropicCompletionRequest)
  } catch (err) {
    if (err instanceof AnthropicClient.APIError) {
      throw new ChatCompletionError(
        `AnthropicClient.APIError: ${err.message}`,
        logRequestData
      )
    } else if (err instanceof Error) {
      throw new ChatCompletionError(err.message, logRequestData)
    }

    throw err
  }

  let content = ''
  let isFirstResponse = true
  for await (const completion of response) {
    let text = completion.completion
    if (isFirstResponse && text.length > 0) {
      isFirstResponse = false
      if (text.startsWith(' ')) {
        text = text.slice(1)
      }
    }
    content += text
    yield text
  }

  const outputMessage: RenderedConversationMessage = {
    type: 'assistant',
    element: <AssistantMessage>{content}</AssistantMessage>,
    content,
    tokens: countTokens(content),
  }

  const responseData: LogChatCompletionResponse<AnthropicChatCompletionRequest> =
    {
      ...logRequestData,
      finishReason: 'stop',
      latency: performance.now() - startTime,
      outputMessage,
      tokensUsed: computeUsage([...renderedMessages, outputMessage]),
    }

  logger.chatCompletionResponse('anthropic', responseData)
}
