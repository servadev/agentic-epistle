## TypeScript — STRICT RULES (never violate)
- `as any` is FORBIDDEN. Do not use it under any circumstances.
- `@ts-ignore` is FORBIDDEN unless already present in existing code.
- If you encounter "Type instantiation is excessively deep", you MUST fix it by adding explicit type annotations — never by casting.
- If you cannot resolve a TS error without `as any`, leave the code unchanged and explain the issue in a comment instead.