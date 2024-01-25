import { wait } from './utils'
import {
  RenderContext,
  coalesceParallelStreams,
  createContext,
} from '../src/context'
import { LogImplementation, LogLevel } from '../src/log'
import { createRenderContext } from '../src/render'
import { AIComponent, AINode } from '../src/types'

const uuidMock = jest.fn()

jest.mock('../src/utils', () => {
  return {
    __esModule: true,
    ...jest.requireActual('../src/utils'),
    uuidv4: (...args: any[]) => {
      return uuidMock(...args)
    },
  }
})

describe('coalesceParallelStreams', () => {
  it('single generator', async () => {
    const stream = async function* () {
      yield 'test'
    }

    const result = coalesceParallelStreams([stream()])
    const valueSpy = jest.fn()
    const doneSpy = jest.fn()
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await result.next()
      if (done) {
        doneSpy(value)
        break
      }
      valueSpy(value)
    }

    expect(valueSpy).toHaveBeenNthCalledWith(1, 'test')
    expect(valueSpy).toHaveBeenCalledTimes(1)

    expect(doneSpy).toHaveBeenCalledWith(undefined)
    expect(doneSpy).toHaveBeenCalledTimes(1)
  })

  it('single generator (delayed yield)', async () => {
    const stream = async function* () {
      await wait()
      yield '1'
      await wait()
      yield '2'
    }

    const result = coalesceParallelStreams([stream()])
    const valueSpy = jest.fn()
    const doneSpy = jest.fn()
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await result.next()
      if (done) {
        doneSpy(value)
        break
      }
      valueSpy(value)
    }

    expect(valueSpy).toHaveBeenNthCalledWith(1, '1')
    expect(valueSpy).toHaveBeenNthCalledWith(2, '2')
    expect(valueSpy).toHaveBeenCalledTimes(2)

    expect(doneSpy).toHaveBeenCalledWith(undefined)
    expect(doneSpy).toHaveBeenCalledTimes(1)
  })

  it('array of generators', async () => {
    const stream1 = async function* () {
      yield 'test1'
      yield 'test2'
      yield 'test3'
    }
    const stream2 = async function* () {
      yield 'test4'
      yield 'test5'
      yield 'test6'
    }

    const result = coalesceParallelStreams([stream1(), stream2()])
    const valueSpy = jest.fn()
    const doneSpy = jest.fn()

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await result.next()
      if (done) {
        doneSpy(value)
        break
      }
      valueSpy(value)
    }

    expect(valueSpy).toHaveBeenNthCalledWith(1, 'test1')
    expect(valueSpy).toHaveBeenNthCalledWith(2, 'test2')
    expect(valueSpy).toHaveBeenNthCalledWith(3, 'test3')
    expect(valueSpy).toHaveBeenNthCalledWith(4, 'test4')
    expect(valueSpy).toHaveBeenNthCalledWith(5, 'test5')
    expect(valueSpy).toHaveBeenNthCalledWith(6, 'test6')
    expect(valueSpy).toHaveBeenCalledTimes(6)

    expect(doneSpy).toHaveBeenCalledWith(undefined)
    expect(doneSpy).toHaveBeenCalledTimes(1)
  })

  it('array of generators (first delayed)', async () => {
    const stream1 = async function* () {
      await wait()
      yield 'test1'
      await wait()
      yield 'test2'
      await wait()
      yield 'test3'
    }
    const stream2 = async function* () {
      yield 'test4'
      yield 'test5'
      yield 'test6'
    }

    const result = coalesceParallelStreams([stream1(), stream2()])
    const valueSpy = jest.fn()
    const doneSpy = jest.fn()

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await result.next()
      if (done) {
        doneSpy(value)
        break
      }
      valueSpy(value)
    }

    expect(valueSpy).toHaveBeenNthCalledWith(1, 'test1')
    expect(valueSpy).toHaveBeenNthCalledWith(2, 'test2')
    expect(valueSpy).toHaveBeenNthCalledWith(3, 'test3')
    expect(valueSpy).toHaveBeenNthCalledWith(4, 'test4')
    expect(valueSpy).toHaveBeenNthCalledWith(5, 'test5')
    expect(valueSpy).toHaveBeenNthCalledWith(6, 'test6')
    expect(valueSpy).toHaveBeenCalledTimes(6)

    expect(doneSpy).toHaveBeenCalledWith(undefined)
    expect(doneSpy).toHaveBeenCalledTimes(1)
  })
})

describe('RenderContext', () => {
  beforeEach(() => {
    uuidMock
      .mockReturnValueOnce('uuid-1')
      .mockReturnValueOnce('uuid-2')
      .mockReturnValueOnce('uuid-3')
      .mockReturnValueOnce('uuid-4')
      .mockReturnValueOnce('uuid-5')
      .mockReturnValueOnce('uuid-6')
      .mockReturnValueOnce('uuid-7')
      .mockReturnValueOnce('uuid-8')
      .mockReturnValueOnce('uuid-9')
  })

  afterEach(() => {
    uuidMock.mockReset()
  })

  describe('passing context', () => {
    it('default context value', async () => {
      const testContext = createContext('test')

      function TestComp(props, { getContext }: RenderContext) {
        const value = getContext(testContext)
        return <>context: {value}</>
      }

      const result = await createRenderContext().render(<TestComp />)
      expect(result).toBe('context: test')
    })

    it('provided value', async () => {
      const testContext = createContext('test')

      function TestComp(props, { getContext }: RenderContext) {
        const value = getContext(testContext)
        return <>context: {value}</>
      }

      const result = await createRenderContext().render(
        <testContext.Provider value="test2">
          <TestComp />
        </testContext.Provider>
      )
      expect(result).toBe('context: test2')
    })

    it('deep nesting', async () => {
      const testContext = createContext('test')

      function TestComp(props, { getContext }: RenderContext) {
        const value = getContext(testContext)
        return <>context: {value}</>
      }
      function Wrap({ children }: { children: AINode }) {
        return <>wrap({children})</>
      }

      const result = await createRenderContext().render(
        <testContext.Provider value="test2">
          <Wrap>
            <TestComp />
          </Wrap>
        </testContext.Provider>
      )
      expect(result).toBe('wrap(context: test2)')
    })

    it('multiple providers', async () => {
      const testContext = createContext('test')

      function TestComp(props, { getContext }: RenderContext) {
        const value = getContext(testContext)
        return <>context: {value}</>
      }
      function Wrap({ children }: { children: AINode }) {
        return <>wrap({children})</>
      }

      const result = await createRenderContext().render(
        <testContext.Provider value="test2">
          <Wrap>
            <testContext.Provider value="test3">
              <TestComp />
            </testContext.Provider>
          </Wrap>
        </testContext.Provider>
      )
      expect(result).toBe('wrap(context: test3)')
    })

    it('multiple contexts', async () => {
      const innerContext = createContext('inner')
      const outerContext = createContext('outer')

      function TestComp(props, { getContext }: RenderContext) {
        const o = getContext(outerContext)
        const i = getContext(innerContext)
        return (
          <>
            outer: {o}, inner: {i}
          </>
        )
      }
      function Wrap({ children }: { children: AINode }) {
        return <>wrap({children})</>
      }

      const result = await createRenderContext().render(
        <outerContext.Provider value="o2">
          <Wrap>
            <innerContext.Provider value="i2">
              <TestComp />
            </innerContext.Provider>
          </Wrap>
        </outerContext.Provider>
      )
      expect(result).toBe('wrap(outer: o2, inner: i2)')
    })
  })

  describe('renderIds', () => {
    const First: AIComponent<any> = ({ children }, { logger }) => {
      logger.info('1')
      return children
    }
    const Second: AIComponent<any> = ({ children }, { logger }) => {
      logger.info('2')
      return children
    }
    const Third: AIComponent<any> = ({ children }, { logger }) => {
      logger.info('3')
      return children
    }
    const Fourth: AIComponent<any> = ({ children }, { logger }) => {
      logger.info('4')
      return children
    }
    const Fifth: AIComponent<any> = ({ children }, { logger }) => {
      logger.info('5')
      return children
    }

    it('default renderIds', async () => {
      const logSpy = jest.fn()
      class TestLogger extends LogImplementation {
        log(ctx: RenderContext, level: LogLevel, message: string): void {
          logSpy({
            tag: ctx.element.tag.name,
            renderId: ctx.renderId,
            parentRenderId: ctx.parentContext?.renderId,
            level,
          })
        }
      }
      const result = await createRenderContext({
        logger: new TestLogger(),
      }).render(
        <First>
          2{' '}
          <Second>
            3{' '}
            <Third>
              4{' '}
              <Fourth>
                5 <Fifth>end</Fifth>
              </Fourth>
            </Third>
          </Second>
        </First>
      )

      expect(result).toBe('2 3 4 5 end')
      expect(logSpy).toHaveBeenCalledTimes(5)
      expect(logSpy).toHaveBeenNthCalledWith(1, {
        tag: 'First',
        renderId: 'uuid-2',
        parentRenderId: 'uuid-1',
        level: 'info',
      })
      expect(logSpy).toHaveBeenNthCalledWith(2, {
        tag: 'Second',
        renderId: 'uuid-3',
        parentRenderId: 'uuid-2',
        level: 'info',
      })
      expect(logSpy).toHaveBeenNthCalledWith(3, {
        tag: 'Third',
        renderId: 'uuid-4',
        parentRenderId: 'uuid-3',
        level: 'info',
      })
      expect(logSpy).toHaveBeenNthCalledWith(4, {
        tag: 'Fourth',
        renderId: 'uuid-5',
        parentRenderId: 'uuid-4',
        level: 'info',
      })
      expect(logSpy).toHaveBeenNthCalledWith(5, {
        tag: 'Fifth',
        renderId: 'uuid-6',
        parentRenderId: 'uuid-5',
        level: 'info',
      })
    })
  })
})
