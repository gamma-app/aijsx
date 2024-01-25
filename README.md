# AIJSX

> This is forked from [@fixie-ai/ai-jsx](https://github.com/fixie-ai/ai-jsx)

**Reasons for forking**

- Streamlined Library: We found that the original library, [@fixie-ai/ai-jsx], came with an abundance of tools, integrations, models, and features that surpassed our project's requirements. Our fork aims to provide a more focused and simplified version tailored to our needs.

- Performance Optimization: The production instance of ai-jsx exhibited performance issues, consuming approximately 30MB of head memory per stream and displaying slow garbage collection. This behavior led to server restarts. Our fork addresses these concerns, optimizing performance and memory usage.

- Tailored Functionality: We identified several features in the original library that were surplus to our project requirements. By eliminating unnecessary functionalities, we aim to create a leaner and faster library.

### What is AIJSX?

AIJSX is a framework/toolkit designed to facilitate the construction of Large Language Model (LLM) prompts in a composable and ergonomic manner by leveraging JSX.

Example:

```ts
import {
  OpenAIChatCompletion,
  SystemMessage,
  UserMessage,
  createRenderContext,
} from '@gammatech/aijsx'

function JokePrompt(props: { input: string }) {
  return (
    <OpenAIChatCompletion>
      <SysytemMessage>You are funny</SysytemMessage>
      <UserMessage>Tell me a joke about: {props.input}</UserMessage>
    </OpenAIChatCompletion>
  )
}

const result = await createRenderContext().render(
  <JokePrompt input="bananas" />
)
```

### Why JSX?

- JSX facilitates the mixing of string interpolation and control flow logic in a type-safe and familiar manner.

- JSX excels in handling composition, allowing the chaining of prompt results to the input of another.

- JSX enjoys widespread support across various build systems and does not necessitate a one-off compilation for string-based templating.

It's important to note that using JSX is distinct from using React. JSX is compile-time sugar that converts a component into a function call. In contrast, React + ReactDOM is a framework responsible for synchronizing the state of a virtual representation of the DOM with an actual browser DOM. AIJSX leverages JSX more akin to using React.renderToString.

### How AIJSX Works to Build Prompts

In its simplest form, AIJSX transforms a tree of JSX components into a string. This resulting string can serve as input to an LLM call or be returned via API, offering flexibility in usage. Unlike React, where components may need to respond to updates and state changes, AIJSX follows a render-once-and-done approach.

### Differences between AIJSX and React

**React's Component Type Signature**

```ts
type Component = (props: P) => React.Element
```

**AIJSX Component Type Signature**

```ts
export interface RenderableStream {
  [Symbol.asyncIterator]: () => AsyncGenerator<string, void, unknown>
}
type AINode = Literal | AIElement<any> | AINode[]
type Renderable = AINode | PromiseLike<Renderable> | RenderableStream

type AIComponent = (props: P, context: RenderContext) => Renderable
```

AIComponents in AIJSX can return two additional types: `PromiseLike<Renderable>` and `RenderableStream`. This distinction fundamentally changes the rendering paradigm in AIJSX, introducing asynchronous rendering that can return either a `Promise` or an object with access to an `AsyncGenerator` (`RenderableStream`).

The asynchronous render abstraction is powerful, allowing chaining of results from asynchronous operations (such as an LLM API call) to the input of another component.

Example:

```ts
const GetLang: AIComponent<{ children: AINode }> = (
  { children },
  { render }
) => {
  const renderedChildren = await render(children)
  const language = await determineLanguage(renderedChildren)

  return language
}
```

You'll notice several differences from normal React components. The second argument to `AIComponent` is the `RenderContext` object, which has a `render` method, allowing us to resolve the value of this components children and use them as inputs to an API call.

Because `GetLang` returns `Promise<string>` which matches the signature of a `Renderable` in AIJSX we can use it as an input in another component

```ts
import {
  OpenAIChatCompletion,
  SystemMessage,
  UserMessage,
  createRenderContext,
} from '@gammatech/aijsx'

const WritePoem: AIComponent<{ input: string }> = (
  { sentence },
  { logger }
) => {
  return (
    <OpenAIChatCompletion>
      <SysytemMessage>You are a world class poet</SysytemMessage>
      <UserMessage>
        Write a poem about "{sentence}" in <GetLang>{sentence}</GetLang>
      </UserMessage>
    </OpenAIChatCompletion>
  )
}

const result = createRenderContext.render(<WritePoem input="公共車" />)
```

The above code will first render all of the elements under `<OpenAIChatCompletion>`

```ts
<OpenAIChatCompletion>
  <SysytemMessage>You are a world class poet</SysytemMessage>
  <UserMessage>
    Write a poem about "公共車" in <GetLang>公共車</GetLang>
  </UserMessage>
</OpenAIChatCompletion>
```

```ts
<OpenAIChatCompletion>
  <SysytemMessage>You are a world class poet</SysytemMessage>
  <UserMessage>Write a poem about "公共車" in Simplified Chinese</UserMessage>
</OpenAIChatCompletion>
```

# Recipes

## Logging

`createRenderContext` can take a `logger: LogImplementation` option. This is used as the base logger when the `RenderContext` traverses the component tree and passes `Logger` to each component.

At the very least, extenders of `LogImplementation` must implement:

```ts
abstract log(ctx: RenderContext, level: LogLevel, message: string): void
```

## Creating Components

**Basic synchronous components**

```tsx
const Text: AIComponent<{ children: AINode }> = ({ children }) => {
  return (
    <>
      {children}
      {'\n'}
    </>
  )
}
```

**Creating Async Components**

```tsx
const AsyncComponent: AIComponent<{ input: string }> = async ({ input }) => {
  const result = await someApICall(input)
  return <>result: {result}</>
}
```

**Creating AsyncGenerator Components**

```tsx
async function* GeneratorComponent(props: { input: string }) {
  yield 'this '
  yield 'is '
  yield 'a '
  yield 'test'

  // NOTE: AsyncGenerator component in AIJSX do not return values, and it's assumed that
  // there yielded results should be string concattenated together
}

async function* GeneratorComponent2(props: { input: string }) {
  return yield* someAsyncGeneratingFunction(input)
}
```

# API Reference

### Top Level Methods

`createRenderContext` - creates a render context used to render a

```ts
export function createRenderContext(opts: {
  logger?: LogImplementation
  rootRenderId?: string
}): RenderContext

export interface RenderContext {
  parentContext: RenderContext | null

  element: AIElement<any>

  renderId: string

  logger: Logger

  getContext<T>(context: Context<T>): T

  render(renderable: Renderable): RenderResult
}
```

**args**

- `logger?: LogImplementation` - Defualts to `NoopLogImplementation`
- `rootRenderId?: string` - allows setting the root RenderContext's renderId, auto-generates a nanoid if left undefined
