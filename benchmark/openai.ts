import { OpenAI as OpenAIClient } from 'openai'
import { Stream } from 'openai/streaming'

import { memoryUsage } from './utils'

async function* run() {
  const client = new OpenAIClient({
    apiKey: process.env.OPENAI_API_KEY,
  })
  type Chunk = OpenAIClient.Chat.Completions.ChatCompletionChunk
  const chatResponse: Stream<Chunk> = await client.chat.completions.create({
    model: 'gpt-3.5-turbo',
    temperature: 0.25,
    messages: [
      {
        content:
          'You have been tasked with generating a short outline for a deck. Your outline should contain up to 50 flat sections. Each section should be returned as plain text on its own line.\n# Examples\nInput:\nA venture capital firm in London\nOutput:\n- Our firm: ____ partners\n- About us\n- Our team\n- Our portfolio\n- News\nInput:\nA ted talk on the science of sleep\nOutput:\n- Circadian rhythm\n- Sleep stages\n- Sleep disorders\n- Factors affecting sleep cycles\nInput:\n破冰环节\nOutput:\n- 破冰环节的宗旨\n- 破冰环节活动举例\n- 破冰环节对团队建设的好处\n- 有效实施破冰环节的挑战\n- 破冰环节成功秘诀\n- 结论和要点\nInput:\nPersonal website for a professional coach\nOutput:\n- My name is _____\n- I help people with _____\n- My process\n- Testimonials\n- Contact me\n',
        role: 'system',
      },
      {
        content:
          'Generate an outline of a deck with up to 50 lines for the following topic:\n---\nlangchain\n---\nYour outline should be plain text with each section on its own line. Please use one level of bullets indicated by a hyphen. You must only return plain text.\nGenerate the outline in English.\n',
        role: 'user',
      },
    ],
    stream: true as const,
  })

  let i = 0
  for await (const message of chatResponse) {
    const delta = message.choices[0].delta
    if (delta.content) {
      if (++i % 5) {
        console.log('memory:', memoryUsage())
      }
      yield delta.content
    }
  }
}

async function main() {
  const start = memoryUsage()
  // console.log('memory start', start)
  let acc = ''
  for await (const result of run()) {
    acc += result
  }
  console.log('result', acc)

  console.log(`start`, start)
  console.log(`end`, memoryUsage())
}

// check if run from cli
if (process.argv[1] === __filename) {
  main()
}
