import { getEncoding } from 'js-tiktoken'

import { ValidOpenAIChatModel } from './OpenAI'
import { RenderedConversationMessage } from '../../chat'

// Preload the tokenizer to avoid a large delay on first use.
const cl100kTokenizer = getEncoding('cl100k_base')
export const tokenizer = {
  encode: (text: string) => cl100kTokenizer.encode(text),
  decode: (tokens: number[]) => cl100kTokenizer.decode(tokens),
}

export function tokenLimitForChatModel(
  model: ValidOpenAIChatModel
): number | undefined {
  const TOKENS_CONSUMED_BY_REPLY_PREFIX = 3

  switch (model) {
    case 'gpt-4':
    case 'gpt-4-0314':
    case 'gpt-4-0613':
      return 8192 - TOKENS_CONSUMED_BY_REPLY_PREFIX
    case 'gpt-4-32k':
    case 'gpt-4-32k-0314':
    case 'gpt-4-32k-0613':
      return 32768 - TOKENS_CONSUMED_BY_REPLY_PREFIX
    case 'gpt-4-1106-preview':
      return 128_000 - TOKENS_CONSUMED_BY_REPLY_PREFIX
    case 'gpt-3.5-turbo':
    case 'gpt-3.5-turbo-0301':
    case 'gpt-3.5-turbo-0613':
      return 4096 - TOKENS_CONSUMED_BY_REPLY_PREFIX
    case 'gpt-3.5-turbo-16k':
    case 'gpt-3.5-turbo-16k-0613':
    case 'gpt-3.5-turbo-1106':
      return 16384 - TOKENS_CONSUMED_BY_REPLY_PREFIX
    default: {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _: never = model
      return undefined
    }
  }
}

export function tokenCountForConversationMessage(
  message: Pick<RenderedConversationMessage, 'type' | 'content'>
): number {
  const TOKENS_PER_MESSAGE = 3
  // const TOKENS_PER_NAME = 1
  switch (message.type) {
    case 'assistant':
    case 'system':
    case 'user':
      return TOKENS_PER_MESSAGE + tokenizer.encode(message.content).length
  }
}
