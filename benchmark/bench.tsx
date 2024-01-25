// import * as AI from 'ai-jsx'
import { Bench } from 'tinybench'

import { createRenderContext } from '../src/render'

async function* Generator({ values }: { values: string[] }) {
  for await (const value of values) {
    yield value
  }
}

const Text = ({ children }: { children }) => {
  // logger.info("I'm a test component: " + children)
  return children
}

async function AsyncComp(props: { resolved: string }) {
  // logger.info("I'm async component: " + props.resolved)

  return (
    <>
      {props.resolved}
      {'\n'}
    </>
  )
}

export async function base() {
  return createRenderContext().render(<Text>hello:</Text>)
}

export async function asyncComp() {
  const result = await createRenderContext().render(
    <AsyncComp resolved="resolved" />
  )
  return result
}
export async function asyncComp10() {
  const result = await createRenderContext().render(
    <>
      <AsyncComp resolved="resolved" />
      <AsyncComp resolved="resolved" />
      <AsyncComp resolved="resolved" />
      <AsyncComp resolved="resolved" />
      <AsyncComp resolved="resolved" />
      <AsyncComp resolved="resolved" />
      <AsyncComp resolved="resolved" />
      <AsyncComp resolved="resolved" />
      <AsyncComp resolved="resolved" />
      <AsyncComp resolved="resolved" />
    </>
  )
  return result
}

export async function nested1(useAIJSX) {
  const result = await createRenderContext(useAIJSX).render(
    <>
      <Text>
        hello:
        <Generator values={['first', 'second', 'third']} />{' '}
      </Text>

      <AsyncComp resolved="resolved" />
      <Text> a </Text>
      <Text> b </Text>
      <Text> c </Text>
    </>
  )
  return result
}

export async function deepNested() {
  return createRenderContext().render(
    <>
      <Text>
        <Text>
          <Text>
            <Text>
              hello:
              <Generator values={['first', 'second', 'third']} />{' '}
            </Text>
          </Text>
        </Text>
      </Text>

      <AsyncComp resolved="resolved" />
      <Text> a </Text>
      <Text> b </Text>
      <Text> c </Text>
    </>
  )
}

async function run() {
  const bench = new Bench({ time: 1000 })
  bench.add('base', async () => {
    const result = await base()
  })

  bench.add('async comp', async () => {
    const result = await asyncComp()
  })

  bench.add('async comp x10', async () => {
    const result = await asyncComp10()
  })

  bench.add('deep nested comp', async () => {
    const result = await deepNested()
  })

  await bench.run()

  console.table(bench.table())
}

run()
