# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: intake.spec.ts >> Create-plan wizard � integration (API + DB) >> full intake ? teaser: single-loan-only
- Location: e2e/intake.spec.ts:31:5

# Error details

```
Error: Channel closed
```

```
Error: locator.click: Target page, context or browser has been closed
Call log:
  - waiting for getByTestId('intake-generate')
    - locator resolved to <button disabled type="submit" data-testid="intake-generate" class="inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5b5fc7] focus-visible:ring-offset-1 focus-visible:ring-offset-[#08080f] disabled:pointer-events-none disabled:opacity-40 cursor-pointer select-none bg-[#5b5fc7] text-white hover:bg-[#4f52b2] active:bg-[#4448a0] rounded-lg material-shadow-accent active:scale-[0.98…>…</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is not enabled
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is not enabled
    - retrying click action
      - waiting 100ms
    2 × waiting for element to be visible, enabled and stable
      - element is not enabled
    - retrying click action
      - waiting 500ms
    - waiting for element to be visible, enabled and stable
    - element is visible, enabled and stable
    - scrolling into view if needed
    - done scrolling
    - element is outside of the viewport
  248 × retrying click action
        - waiting 500ms
        - waiting for element to be visible, enabled and stable
        - element is visible, enabled and stable
        - scrolling into view if needed
        - done scrolling
        - <div class="fixed inset-0 z-[60] flex items-center justify-center px-4">…</div> intercepts pointer events
  - retrying click action
    - waiting 500ms
    - waiting for element to be visible, enabled and stable

```

```
Error: browserContext.close: Target page, context or browser has been closed
```