import { OpenAI as OpenAIClient } from 'openai'
import { Stream } from 'openai/streaming'

import { tokenCountForConversationMessage } from './tokenizer'
import {
  AssistantMessage,
  ChatCompletionError,
  RenderedConversationMessage,
  childrenToConversationMessage,
  computeUsage,
} from '../../chat'
import { RenderContext, createContext } from '../../context'
import { LogChatCompletionRequest, LogChatCompletionResponse } from '../../log'
import { AIElement } from '../../types'
import { getEnvVar } from '../../utils'

export type OpenAIChatCompletionRequest =
  OpenAIClient.Chat.Completions.ChatCompletionCreateParamsStreaming

type OpenAIChatMessage =
  OpenAIClient.Chat.Completions.ChatCompletionMessageParam

// extend the chat completion request payloads for log messages
declare module '@gammatech/aijsx' {
  interface ChatCompletionRequestPayloads {
    openai: OpenAIChatCompletionRequest
  }
}

export type ValidOpenAIChatModel =
  | 'gpt-4'
  | 'gpt-4-0314' // discontinue on 06/13/2024
  | 'gpt-4-0613'
  | 'gpt-4-32k'
  | 'gpt-4-32k-0314' // discontinue on 06/13/2024
  | 'gpt-4-32k-0613'
  | 'gpt-4-1106-preview'
  | 'gpt-3.5-turbo'
  | 'gpt-3.5-turbo-0301' // discontinue on 06/13/2024
  | 'gpt-3.5-turbo-0613'
  | 'gpt-3.5-turbo-16k'
  | 'gpt-3.5-turbo-16k-0613'
  | 'gpt-3.5-turbo-1106'

// memoize default client
let defaultClient: OpenAIClient | null = null

export const OpenAIClientContext = createContext<() => OpenAIClient>(() => {
  if (defaultClient) {
    return defaultClient
  }
  const apiKey = getEnvVar('OPENAI_API_KEY', true)
  defaultClient = new OpenAIClient({ apiKey })
  return defaultClient
})

type OpenAIChatCompletionProps = {
  model: ValidOpenAIChatModel
  maxTokens?: number
  temperature?: number
  children: AIElement<any> | AIElement<any>[]
  // for tracking purposes
  provider?: string
  providerRegion?: string
}
export async function* OpenAIChatCompletion(
  props: OpenAIChatCompletionProps,
  { logger, render, getContext }: RenderContext
): AsyncGenerator<string, void, unknown> {
  const startTime = performance.now()

  const client = getContext(OpenAIClientContext)()
  if (!client) {
    throw new Error('[OpenAI] must supply OpenAI model via context')
  }

  const renderedMessages = await Promise.all(
    childrenToConversationMessage(props.children).map<
      Promise<RenderedConversationMessage>
    >(async (message) => {
      const partiallyRendered = {
        ...message,
        content: await render(message.element),
      }
      return {
        ...partiallyRendered,
        tokens: tokenCountForConversationMessage(partiallyRendered),
      }
    })
  )

  const chatMessages = renderedMessages.map<OpenAIChatMessage>((m) => {
    return {
      content: m.content,
      role: m.type,
    }
  })

  const chatCompletionRequest: OpenAIChatCompletionRequest = {
    model: props.model,
    max_tokens: props.maxTokens,
    temperature: props.temperature,
    messages: chatMessages,
    stream: true as const,
  }

  const logRequestData: LogChatCompletionRequest<OpenAIChatCompletionRequest> =
    {
      startTime,
      model: props.model,
      provider: props.provider,
      providerRegion: props.providerRegion,
      inputMessages: renderedMessages,
      request: chatCompletionRequest,
    }
  logger.chatCompletionRequest('openai', logRequestData)

  type Chunk = OpenAIClient.Chat.Completions.ChatCompletionChunk
  let chatResponse: Stream<Chunk>
  try {
    chatResponse = await client.chat.completions.create(chatCompletionRequest)
  } catch (ex) {
    if (ex instanceof OpenAIClient.APIError) {
      throw new ChatCompletionError(
        `OpenAIClient.APIError: ${ex.message}`,
        logRequestData
      )
    } else if (ex instanceof Error) {
      throw new ChatCompletionError(ex.message, logRequestData)
    }

    throw ex
  }

  // console.log('got to finish reason')
  let finishReason: string | undefined = undefined

  // we assume all messages coming back are from assistant because together.ai
  // does not report an assistant role
  let content = ''
  for await (const message of chatResponse) {
    if (!message.choices || !message.choices[0]) {
      continue
    }

    const delta = message.choices[0].delta

    if (message.choices[0].finish_reason) {
      finishReason = message.choices[0].finish_reason
    }
    if (delta.content) {
      content += delta.content
      yield delta.content
    }
  }

  const outputMessage: RenderedConversationMessage = {
    type: 'assistant',
    element: <AssistantMessage>{content}</AssistantMessage>,
    content,
    tokens: tokenCountForConversationMessage({
      type: 'assistant',
      content,
    }),
  }

  const responseData: LogChatCompletionResponse<OpenAIChatCompletionRequest> = {
    ...logRequestData,
    finishReason: finishReason!,
    latency: performance.now() - startTime,
    outputMessage,
    tokensUsed: computeUsage([...renderedMessages, outputMessage]),
  }

  logger.chatCompletionResponse('openai', responseData)
}
