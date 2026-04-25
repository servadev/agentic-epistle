## TypeScript Error Handling
- Never use `as any` to suppress TypeScript errors
- Never use `@ts-ignore` or `@ts-expect-error` without a comment explaining why
- Fix type errors at their source (missing annotations, incorrect generics) not at the call site
- Prefer explicit return type annotations to resolve "excessively deep" instantiation errors