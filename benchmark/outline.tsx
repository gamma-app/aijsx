import { OpenAIChatCompletion } from '../src//lib/openai/OpenAI'
import { SystemMessage, UserMessage } from '../src/chat'
import { createRenderContext } from '../src/render'
import { AINode } from '../src/types'
import { memoryUsage } from './utils'

function Text({ children }: { children: AINode }) {
  return (
    <>
      {children}
      {'\n'}
    </>
  )
}

const GenerateOutlineSimpleComponent = (variables: any) => {
  const { format, numBullets, topic, language } = variables
  return (
    <OpenAIChatCompletion model="gpt-3.5-turbo" temperature={0.25}>
      <SystemMessage>
        <Text>
          You have been tasked with generating a short outline for a {format}.
          Your outline should contain up to {numBullets} flat sections. Each
          section should be returned as plain text on its own line.
        </Text>

        <Text># Examples</Text>

        <Text>Input:</Text>
        <Text>A venture capital firm in London</Text>

        <Text>Output:</Text>
        <Text>- Our firm: ____ partners</Text>
        <Text>- About us</Text>
        <Text>- Our team</Text>
        <Text>- Our portfolio</Text>
        <Text>- News</Text>

        <Text>Input:</Text>
        <Text>A ted talk on the science of sleep</Text>

        <Text>Output:</Text>
        <Text>- Circadian rhythm</Text>
        <Text>- Sleep stages</Text>
        <Text>- Sleep disorders</Text>
        <Text>- Factors affecting sleep cycles</Text>

        <Text>Input:</Text>
        <Text>破冰环节</Text>
        <Text>Output:</Text>
        <Text>- 破冰环节的宗旨</Text>
        <Text>- 破冰环节活动举例</Text>
        <Text>- 破冰环节对团队建设的好处</Text>
        <Text>- 有效实施破冰环节的挑战</Text>
        <Text>- 破冰环节成功秘诀</Text>
        <Text>- 结论和要点</Text>
        <Text>Input:</Text>
        <Text>Personal website for a professional coach</Text>
        <Text>Output:</Text>
        <Text>- My name is _____</Text>
        <Text>- I help people with _____</Text>
        <Text>- My process</Text>
        <Text>- Testimonials</Text>
        <Text>- Contact me</Text>
      </SystemMessage>
      <UserMessage>
        <Text>
          Generate an outline of a {format} with up to {numBullets} lines for
          the following topic:
        </Text>
        <Text>---</Text>
        <Text>{topic}</Text>
        <Text>---</Text>

        <Text>
          Your outline should be plain text with each section on its own line.
          Please use one level of bullets indicated by a hyphen. You must only
          return plain text.
        </Text>
        <Text>Generate the outline in {language}.</Text>
      </UserMessage>
    </OpenAIChatCompletion>
  )
}

async function run(mem = false) {
  let accum = ''
  const result = createRenderContext().render(
    <GenerateOutlineSimpleComponent
      format="deck"
      numBullets={50}
      topic="langchain"
      language="English"
    />
  )

  let i = 0
  for await (const r of result) {
    accum += r
    if (mem) {
      if (i % 10) {
        console.log('memory:', memoryUsage())
      }
    }
    i++
  }
  return result
}

async function main() {
  const start = await memoryUsage()
  console.log('memory start', start)
  await Promise.all(Array.from({ length: 5 }, (_v, ind) => run(ind === 0)))
  console.log('memory start', start, 'finish', memoryUsage())
}

// check if run from cli
if (process.argv[1] === __filename) {
  main()
}
