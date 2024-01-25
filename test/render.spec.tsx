import { RenderContext } from '../src/context'
import { NoopLogImplementation } from '../src/log'
import { createRenderContext } from '../src/render'
import { AINode } from '../src/types'
import { wait } from './utils'

async function* GeneratorComp(
  {
    values,
  }: {
    values: string[]
  },
  { logger }: RenderContext
) {
  for await (const value of values) {
    // logger.info('yielding' + value)
    yield value
  }
}

const TextComp = (
  {
    children,
  }: {
    children: AINode
  },
  { logger }: RenderContext
) => {
  // logger.info("I'm a test component: " + children)
  return (
    <>
      text: {children}
      {'\n'}
    </>
  )
}

async function AsyncComp(
  props: { resolved: string },
  { logger }: RenderContext
) {
  // logger.info("I'm async component: " + props.resolved)

  return (
    <>
      resolved: {props.resolved}
      {'\n'}
    </>
  )
}

const TestComponent = () => {
  return (
    <>
      <TextComp>First</TextComp>
      <AsyncComp resolved="resolved" />
      <TextComp>second</TextComp>
      <TextComp>third</TextComp>
      <GeneratorComp values={['a', 'b', 'c']} />
    </>
  )
}

const Wrapper = ({ children }: { children: AINode }) => {
  return <>wrap({children})</>
}

describe('render', () => {
  describe('Literal', () => {
    // test all Literals
    test('text', async () => {
      const result = await createRenderContext().render('Hello')
      expect(result).toBe('Hello')
    })
    test('number', async () => {
      const result = await createRenderContext().render(9)
      expect(result).toBe('9')
    })
    test('null', async () => {
      const result = await createRenderContext().render(null)
      expect(result).toBe('')
    })
    test('boolean', async () => {
      const result = await createRenderContext().render(true)
      expect(result).toBe('')
    })
    test('undefined', async () => {
      const result = await createRenderContext().render(undefined)
      expect(result).toBe('')
    })
  })

  describe('AIElement', () => {
    test('text', async () => {
      const El = () => 'Hello'
      const result = await createRenderContext().render(<El />)
      expect(result).toBe('Hello')
    })
    test('number', async () => {
      const El = () => 9
      const result = await createRenderContext().render(<El />)
      expect(result).toBe('9')
    })
    test('null', async () => {
      const El = () => null
      const result = await createRenderContext().render(<El />)
      expect(result).toBe('')
    })
    test('boolean', async () => {
      const El = () => true
      const result = await createRenderContext().render(<El />)
      expect(result).toBe('')
    })
    test('undefined', async () => {
      const El = () => undefined
      const result = await createRenderContext().render(<El />)
      expect(result).toBe('')
    })
  })

  describe('PromiseLike<Renderable>', () => {
    test('resolves text', async () => {
      async function AsyncComp(props: { val: string }) {
        await wait()
        return props.val
      }

      const result = await createRenderContext().render(
        <AsyncComp val="test" />
      )
      expect(result).toBe('test')
    })

    test('resolves element', async () => {
      async function AsyncComp(props: { val: string }) {
        await wait()
        return <Wrapper>{props.val}</Wrapper>
      }

      const result = await createRenderContext().render(
        <AsyncComp val="test" />
      )
      expect(result).toBe('wrap(test)')
    })

    test('resolves array of things (children)', async () => {
      async function AsyncComp(props: { val: string }) {
        await wait()
        return (
          <>
            <Wrapper>1</Wrapper>
            <Wrapper>2</Wrapper>
            <Wrapper>3</Wrapper>
          </>
        )
      }

      const result = await createRenderContext().render(
        <AsyncComp val="test" />
      )
      expect(result).toBe('wrap(1)wrap(2)wrap(3)')
    })

    test('resolves another async component', async () => {
      async function AsyncComp() {
        await wait()
        return (
          <>
            <Wrapper>inner</Wrapper>
          </>
        )
      }
      async function MainComp() {
        await wait()
        return (
          <Wrapper>
            <AsyncComp />
          </Wrapper>
        )
      }

      const result = await createRenderContext().render(<MainComp />)
      expect(result).toBe('wrap(wrap(inner))')
    })

    test('resolves a generator', async () => {
      async function* GeneratorComp() {
        yield 'a'
        wait()
        yield 'b'
        wait()
        yield 'c'
      }

      async function MainComp() {
        await wait()
        return (
          <Wrapper>
            <GeneratorComp />
          </Wrapper>
        )
      }

      const result = await createRenderContext().render(<MainComp />)
      expect(result).toBe('wrap(abc)')
    })

    test('resolves an undefined value', async () => {
      const Text = ({ children }: { children: AINode }) => <>{children}</>

      async function MainComp() {
        await wait()
        return (
          <Wrapper>
            <Text>1</Text>
            {true && <Text>2</Text>}
            {false && <Text>3</Text>}
            {undefined && <Text>4</Text>}
            {1 && <Text>5</Text>}
            {0 && <Text>6</Text>}
          </Wrapper>
        )
      }

      const result = await createRenderContext().render(<MainComp />)
      expect(result).toBe('wrap(125)')
    })
  })

  describe('RenderableStream', () => {
    describe('.then() API', () => {
      test('resolves text', async () => {
        async function* Text() {
          yield '1'
          await wait()
          yield '2'
          await wait()
          yield '3'
        }

        const result = await createRenderContext().render(<Text />)
        expect(result).toBe('123')
      })

      test('nested AsyncGenerator', async () => {
        async function* Text() {
          yield '1'
          await wait()
          yield '2'
          await wait()
          yield '3'
        }
        async function AsyncComp({ children }: { children: AINode }) {
          await wait()
          const value = 'prefix: '

          return (
            <>
              {value}
              {children}
            </>
          )
        }

        const result = await createRenderContext().render(
          <AsyncComp>
            <Text />
          </AsyncComp>
        )
        expect(result).toBe('prefix: 123')
      })
    })

    describe('for ... await API', () => {
      test('resolves text', async () => {
        async function* Text() {
          yield '1'
          await wait()
          yield '2'
          await wait()
          yield '3'
        }

        const result = createRenderContext().render(<Text />)
        let spy = jest.fn()

        for await (const val of result) {
          spy(val)
        }

        expect(spy).toHaveBeenNthCalledWith(1, '1')
        expect(spy).toHaveBeenNthCalledWith(2, '2')
        expect(spy).toHaveBeenNthCalledWith(3, '3')
        expect(spy).toHaveBeenCalledTimes(3)
      })

      test('nested AsyncGenerator', async () => {
        async function* Text() {
          yield '1'
          await wait()
          yield '2'
          await wait()
          yield '3'
        }
        async function AsyncComp({ children }: { children: AINode }) {
          await wait()
          const value = 'prefix: '

          return (
            <>
              {value}
              {children}
            </>
          )
        }

        const result = createRenderContext().render(
          <AsyncComp>
            <Text />
          </AsyncComp>
        )

        const spy = jest.fn()
        for await (const val of result) {
          spy(val)
        }

        expect(spy).toHaveBeenNthCalledWith(1, 'prefix: ')
        expect(spy).toHaveBeenNthCalledWith(2, '1')
        expect(spy).toHaveBeenNthCalledWith(3, '2')
        expect(spy).toHaveBeenNthCalledWith(4, '3')
        expect(spy).toHaveBeenCalledTimes(4)
      })

      test('out of order AsyncGenerator', async () => {
        async function* Text() {
          yield '1'
          await wait()
          yield '2'
          await wait()
          yield '3'
        }
        async function AsyncComp({ children }: { children: AINode }) {
          await wait()
          const value = 'last'

          return (
            <>
              {children}
              {value}
            </>
          )
        }

        const result = createRenderContext().render(
          <AsyncComp>
            <Text />
          </AsyncComp>
        )

        const spy = jest.fn()
        for await (const val of result) {
          spy(val)
        }

        expect(spy).toHaveBeenNthCalledWith(1, '1')
        expect(spy).toHaveBeenNthCalledWith(2, '2')
        expect(spy).toHaveBeenNthCalledWith(3, '3')
        expect(spy).toHaveBeenNthCalledWith(4, 'last')
        expect(spy).toHaveBeenCalledTimes(4)
      })

      test('array of AsyncGenerator', async () => {
        async function* Gen1() {
          await wait(10)
          yield '1'
          await wait()
          yield '2'
          await wait()
          yield '3'
        }
        async function* Gen2() {
          yield '4'
          yield '5'
          yield '6'
        }
        async function* Gen3() {
          yield '7'
          await wait()
          yield '8'
          await wait()
          yield '9'
        }

        const result = createRenderContext().render(
          <>
            <Gen1 />
            <Gen2 />
            <Gen3 />
          </>
        )

        const spy = jest.fn()
        for await (const val of result) {
          spy(val)
        }

        expect(spy).toHaveBeenNthCalledWith(1, '1')
        expect(spy).toHaveBeenNthCalledWith(2, '2')
        expect(spy).toHaveBeenNthCalledWith(3, '3')
        expect(spy).toHaveBeenNthCalledWith(4, '4')
        expect(spy).toHaveBeenNthCalledWith(5, '5')
        expect(spy).toHaveBeenNthCalledWith(6, '6')
        expect(spy).toHaveBeenNthCalledWith(7, '7')
        expect(spy).toHaveBeenNthCalledWith(8, '8')
        expect(spy).toHaveBeenNthCalledWith(9, '9')
        expect(spy).toHaveBeenCalledTimes(9)
      })
    })
  })
})
