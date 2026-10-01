/**
 * Side-effect only: loads the app's real Tailwind output so components that depend
 * on CSS for layout (an empty Checkbox/Switch `<span>` sized only by a `size-*`
 * utility) have a real, clickable size in browser tests.
 */
import "#/styles/index.css";
