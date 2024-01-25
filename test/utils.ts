import { OpenAIClient } from '../src/lib/openai'

export const wait = (ms: number = 0) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms))

export const openAIStreamMessages = (contents: string[]) => {
  return async function* () {
    for (let i = 0; i < contents.length; i++) {
      const str = contents[i]
      const isLast = i === contents.length - 1
      const chunk: OpenAIClient.Chat.Completions.ChatCompletionChunk = {
        id: 'test-chunk-id',
        choices: [
          {
            index: 0,
            delta: {
              content: str,
              role: 'assistant',
            },
            finish_reason: isLast ? 'stop' : null,
          },
        ],
        created: 1,
        model: 'gpt-3.5-turbo',
        object: 'chat.completion.chunk',
      }

      yield chunk
    }
    return ''
  }
}

export const mockOpenAIClientChatCompletion = (mockFn: any) => {
  return {
    chat: {
      completions: {
        create: mockFn,
      },
    },
  } as OpenAIClient
}
