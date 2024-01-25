type Handler<A> = (val: A) => void

type UnsubscribeFn = () => void

export class EventEmitter<
  EventPayloads,
  Keys extends keyof EventPayloads = keyof EventPayloads
> {
  protected listeners: {
    [s in Keys]: Handler<EventPayloads[Keys]>[]
  } = {} as any

  protected piped: EventEmitter<EventPayloads, Keys>[] = []

  on<K extends Keys>(
    key: K,
    handler: Handler<EventPayloads[K]>
  ): UnsubscribeFn {
    this.listeners[key] = this.listeners[key] || []
    this.listeners[key].push(handler)
    return () => {
      const ind = this.listeners[key].indexOf(handler)
      if (ind > -1) {
        this.listeners[key].splice(ind, 1)
      }
    }
  }

  off<K extends Keys>(key: K): void
  off<K extends Keys>(key: K, handler: Handler<EventPayloads[K]>): void
  off<K extends Keys>(key: K, handler?: Handler<EventPayloads[K]>) {
    if (typeof handler === 'function') {
      const ind = this.listeners[key].indexOf(handler)
      if (ind > -1) {
        this.listeners[key].splice(ind, 1)
      }
    } else {
      this.listeners[key] = []
    }
  }

  emit<L extends Keys>(key: L, payload: EventPayloads[L]) {
    const fns = this.listeners[key] || []
    fns.forEach((fn) => fn(payload))

    this.piped.forEach((emitter) => {
      emitter.emit(key, payload)
    })
  }

  pipe(emitter: EventEmitter<EventPayloads, Keys>): UnsubscribeFn {
    this.piped.push(emitter)

    return () => {
      const ind = this.piped.indexOf(emitter)
      if (ind > -1) {
        this.piped.splice(ind, 1)
      }
    }
  }
}
