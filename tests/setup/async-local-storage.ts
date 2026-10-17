// Next's server runtime expects AsyncLocalStorage to be a
// global (every runtime Next deploys to provides it). A bare
// Node process — which is what vitest runs in — does not, so
// Next falls back to a fake whose run()/exit()/disable() throw
// "AsyncLocalStorage accessed in runtime where it is not
// available". Expose the built-in implementation before any
// test imports next/server so middleware instrumentation
// (including middleware fetch calls) behaves as it does in
// production runtimes.
import { AsyncLocalStorage } from "node:async_hooks";

const globalWithStorage = globalThis as typeof globalThis & {
  AsyncLocalStorage?: typeof AsyncLocalStorage;
};

globalWithStorage.AsyncLocalStorage ??= AsyncLocalStorage;
