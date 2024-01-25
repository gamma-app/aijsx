import { RenderContext } from '../src/context'
import { LogImplementation, LogLevel, Logger } from '../src/log'
import { createRenderContext } from '../src/render'

describe('Logger', () => {
  const logSpy = jest.fn()
  let logger: Logger

  class TestLogImplemenation extends LogImplementation {
    log(_ctx: RenderContext, level: LogLevel, message: string): void {
      logSpy(level, message)
    }
  }

  beforeEach(() => {
    const ctx = createRenderContext({
      logger: new TestLogImplemenation(),
    })

    logger = ctx.logger
  })

  test('single string', () => {
    logger.info('test')
    expect(logSpy).toHaveBeenCalledWith('info', 'test')
  })

  test('single number', () => {
    logger.info(1)
    expect(logSpy).toHaveBeenCalledWith('info', '1')
  })

  test('single boolean', () => {
    logger.info(true)
    expect(logSpy).toHaveBeenCalledWith('info', 'true')
  })
  test('single undefined', () => {
    logger.info(undefined)
    expect(logSpy).toHaveBeenCalledWith('info', 'undefined')
  })

  test('single null', () => {
    logger.info(null)
    expect(logSpy).toHaveBeenCalledWith('info', 'null')
  })

  test('single object', () => {
    logger.info({ test: true })
    expect(logSpy).toHaveBeenCalledWith('info', '{"test":true}')
  })

  test('multiple strings', () => {
    logger.info('test', 'test2')
    expect(logSpy).toHaveBeenCalledWith('info', 'test test2')
  })

  test('multiple numbers', () => {
    logger.info(1, 2)
    expect(logSpy).toHaveBeenCalledWith('info', '1 2')
  })

  test('multiple booleans', () => {
    logger.info(true, false)
    expect(logSpy).toHaveBeenCalledWith('info', 'true false')
  })

  test('multiple undefined', () => {
    logger.info(undefined, undefined)
    expect(logSpy).toHaveBeenCalledWith('info', 'undefined undefined')
  })

  test('multiple null', () => {
    logger.info(null, null)
    expect(logSpy).toHaveBeenCalledWith('info', 'null null')
  })

  test('multiple objects', () => {
    logger.info({ test: true }, { test: false })
    expect(logSpy).toHaveBeenCalledWith('info', '{"test":true} {"test":false}')
  })

  test('a little bit of everything', () => {
    logger.info('test', 1, true, undefined, null, { test: true })
    expect(logSpy).toHaveBeenCalledWith(
      'info',
      'test 1 true undefined null {"test":true}'
    )
  })
})
