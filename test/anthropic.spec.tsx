import { SystemMessage, UserMessage } from '../src/chat'
import { AnthropicClient } from '../src/lib/anthropic'
import {
  AnthropicChatCompletion,
  AnthropicClientContext,
} from '../src/lib/anthropic/Anthropic'
import { createRenderContext } from '../src/render'

describe('Anthropic', () => {
  describe('when it errors', () => {
    let client: AnthropicClient

    beforeEach(() => {
      class NewError extends Error {}
      async function createCompletion(...args: any[]) {
        throw new AnthropicClient.APIError(
          429,
          new NewError('inner error message'),
          'Test error',
          undefined
        )
      }

      client = {
        completions: {
          create: createCompletion,
        },
      } as any as AnthropicClient
    })

    afterEach(() => {
      jest.resetAllMocks()
    })

    it('should pass the error message, name and request data to the ChatCompletionError object', async () => {
      expect.assertions(2)
      try {
        await createRenderContext().render(
          <AnthropicClientContext.Provider value={() => client}>
            <AnthropicChatCompletion
              model="claude-2.1"
              provider="azure"
              providerRegion="eastUs2"
            >
              <SystemMessage>you are a comedian</SystemMessage>
              <UserMessage>tell me a joke about bananas</UserMessage>
            </AnthropicChatCompletion>
          </AnthropicClientContext.Provider>
        )
      } catch (err: unknown) {
        expect(err as Error).toHaveProperty(
          'message',
          'AnthropicClient.APIError: 429 inner error message'
        )
        expect(err as Error).toHaveProperty(
          'chatCompletionRequest',
          expect.objectContaining({
            model: 'claude-2.1',
            provider: 'azure',
            providerRegion: 'eastUs2',
          })
        )
      }
    })
  })

  // it('should work', async () => {
  //   const result = await createRenderContext().render(
  //     <AnthropicChatCompletion model="claude-instant-1.2">
  //       <SystemMessage>you are a comedian</SystemMessage>
  //       <UserMessage>tell me a joke about bananas</UserMessage>
  //     </AnthropicChatCompletion>
  //   )
  //
  //   expect(result).toBe(dedent`
  //     you are a comedian
  //     tell me a joke
  //   `)
  // })
  //
  // it('context should work', async () => {
  //   const client = new AnthropicClient({
  //     apiKey: process.env.ANTHROPIC_API_KEY,
  //   })
  //
  //   const result = await createRenderContext().render(
  //     <AnthropicClientContext.Provider value={() => client}>
  //       <AnthropicChatCompletion model="claude-instant-1.2">
  //         <SystemMessage>you are a comedian</SystemMessage>
  //         <UserMessage>tell me a joke about bananas</UserMessage>
  //       </AnthropicChatCompletion>
  //     </AnthropicClientContext.Provider>
  //   )
  //
  //   expect(result).toBe(dedent`
  //     you are a comedian
  //     tell me a joke
  //   `)
  // })
})
