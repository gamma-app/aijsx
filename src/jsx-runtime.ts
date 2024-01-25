/**
 * The is used as an import source for ts/js files as the JSX transpile functinos
 */
import { AIFragment, createAIElement } from './createElement'
import { AIElement, AIComponent } from './types'

/** @hidden */
export declare namespace JSX {
  type ElementType = AIComponent<any>
  interface Element extends AIElement<any> {}
  interface IntrinsicElements {}
  interface ElementChildrenAttribute {
    children: {}
  }
}

/** @hidden */
export function jsx(type: any, config: any, maybeKey?: any) {
  const configWithKey =
    maybeKey !== undefined ? { ...config, key: maybeKey } : config
  const children =
    config && Array.isArray(config.children) ? config.children : []
  return createAIElement(type, configWithKey, ...children)
}
/** @hidden */
export const jsxDEV = jsx

/** @hidden */
export const jsxs = jsx

/** @hidden */
export const Fragment = AIFragment
