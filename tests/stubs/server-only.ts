// Test stub for the `server-only` package.
//
// The real package throws when a module is imported outside a React Server
// Component bundler context. Unit tests run in plain Node, so the guard is
// replaced with a no-op — the modules under test still keep their `server-only`
// import, which is what protects them in a real client bundle.
export {};
