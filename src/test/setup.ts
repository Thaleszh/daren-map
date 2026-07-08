// Registers @testing-library/jest-dom matchers (toBeInTheDocument, etc.) and
// clears the DOM between tests. Loaded via setupFiles in vitest.config.ts.
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => cleanup());

// jsdom ships neither of these; react-zoom-pan-pinch reads them on mount, so the
// map stage would otherwise throw. Minimal no-op stubs are enough for rendering.
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
if (typeof globalThis.matchMedia === "undefined") {
  // @ts-expect-error partial stub — only the fields consumers touch
  globalThis.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent() {
      return false;
    },
  });
}
