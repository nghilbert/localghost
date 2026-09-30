/// <reference path="../../node_modules/@base-ui/react/global.d.ts" />

/**
 * Side-effect only. Base UI waits for `getAnimations()` to settle before it
 * unmounts a popup (`internals/useAnimationsFinished`), so an open/close test
 * would race the CSS transitions on popups. The library reads this
 * global to skip that wait.
 *
 * `@base-ui/react/global` is the ambient declaration that types it; the package
 * does not list it in `exports`, so the reference is written by hand.
 */
globalThis.BASE_UI_ANIMATIONS_DISABLED = true;
