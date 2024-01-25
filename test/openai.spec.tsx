import { openAIStreamMessages } from './utils'
import { SystemMessage, UserMessage } from '../src/chat'
import { OpenAIClient } from '../src/lib/openai'
import {
  OpenAIChatCompletion,
  OpenAIClientContext,
} from '../src/lib/openai/OpenAI'
import { createRenderContext } from '../src/render'

describe('OpenAI', () => {
  describe('successful response', () => {
    let client: OpenAIClient
    const mockFn = jest.fn()

    beforeEach(() => {
      async function* createCompletion(...args: any[]) {
        mockFn(...args)
        const result = openAIStreamMessages(['this ', 'is ', 'a ', 'test'])
        yield* result()
      }
      client = {
        chat: {
          completions: {
            create: createCompletion,
          },
        },
      } as any as OpenAIClient
    })

    afterEach(() => {
      jest.resetAllMocks()
    })

    it('should resolve the streamed data', async () => {
      const result = await createRenderContext().render(
        <OpenAIClientContext.Provider value={() => client}>
          <OpenAIChatCompletion model="gpt-3.5-turbo">
            <SystemMessage>you are a comedian</SystemMessage>
            <UserMessage>tell me a joke about bananas</UserMessage>
          </OpenAIChatCompletion>
        </OpenAIClientContext.Provider>
      )

      expect(result).toBe('this is a test')

      expect(mockFn).toHaveBeenCalledWith({
        temperature: undefined,
        messages: [
          {
            role: 'system',
            content: 'you are a comedian',
          },
          {
            role: 'user',
            content: 'tell me a joke about bananas',
          },
        ],
        stream: true,
        max_totens: undefined,
        model: 'gpt-3.5-turbo',
      })
    })

    it('should stream back the data', async () => {
      const result = createRenderContext().render(
        <OpenAIClientContext.Provider value={() => client}>
          <OpenAIChatCompletion model="gpt-3.5-turbo">
            <SystemMessage>you are a comedian</SystemMessage>
            <UserMessage>tell me a joke about bananas</UserMessage>
          </OpenAIChatCompletion>
        </OpenAIClientContext.Provider>
      )

      const resultSpy = jest.fn()
      for await (const val of result) {
        resultSpy(val)
      }

      expect(resultSpy).toHaveBeenNthCalledWith(1, 'this ')
      expect(resultSpy).toHaveBeenNthCalledWith(2, 'is ')
      expect(resultSpy).toHaveBeenNthCalledWith(3, 'a ')
      expect(resultSpy).toHaveBeenNthCalledWith(4, 'test')
    })

    it('should pass temperature + maxTokens', async () => {
      const result = await createRenderContext().render(
        <OpenAIClientContext.Provider value={() => client}>
          <OpenAIChatCompletion model="gpt-4" temperature={1} maxTokens={1000}>
            <SystemMessage>you are a comedian</SystemMessage>
            <UserMessage>tell me a joke about bananas</UserMessage>
          </OpenAIChatCompletion>
        </OpenAIClientContext.Provider>
      )

      expect(result).toBe('this is a test')

      expect(mockFn).toHaveBeenCalledWith({
        messages: [
          {
            role: 'system',
            content: 'you are a comedian',
          },
          {
            role: 'user',
            content: 'tell me a joke about bananas',
          },
        ],
        stream: true,
        max_tokens: 1000,
        temperature: 1,
        model: 'gpt-4',
      })
    })
  })

  describe('when it errors', () => {
    let client: OpenAIClient

    beforeEach(() => {
      class NewError extends Error {}
      async function createCompletion(...args: any[]) {
        throw new OpenAIClient.APIError(
          429,
          new NewError('inner error message'),
          'Test error',
          undefined
        )
      }

      client = {
        chat: {
          completions: {
            create: createCompletion,
          },
        },
      } as any as OpenAIClient
    })

    afterEach(() => {
      jest.resetAllMocks()
    })

    it('should pass the error message, name and request data to the ChatCompletionError object', async () => {
      expect.assertions(2)
      try {
        await createRenderContext().render(
          <OpenAIClientContext.Provider value={() => client}>
            <OpenAIChatCompletion
              model="gpt-3.5-turbo"
              provider="azure"
              providerRegion="eastUs2"
            >
              <SystemMessage>you are a comedian</SystemMessage>
              <UserMessage>tell me a joke about bananas</UserMessage>
            </OpenAIChatCompletion>
          </OpenAIClientContext.Provider>
        )
      } catch (err: unknown) {
        expect(err as Error).toHaveProperty(
          'message',
          'OpenAIClient.APIError: 429 inner error message'
        )
        expect(err as Error).toHaveProperty(
          'chatCompletionRequest',
          expect.objectContaining({
            model: 'gpt-3.5-turbo',
            provider: 'azure',
            providerRegion: 'eastUs2',
          })
        )
      }
    })
  })

  // it('should work', async () => {
  //   const result = await createRenderContext().render(
  //     <OpenAIChatCompletion model="gpt-3.5-turbo">
  //       <SystemMessage>you are a comedian</SystemMessage>
  //       <UserMessage>tell me a joke about bananas</UserMessage>
  //     </OpenAIChatCompletion>
  //   )
  //
  //   expect(result).toBe(dedent`
  //     you are a comedian
  //     tell me a joke
  //   `)
  // })
})
