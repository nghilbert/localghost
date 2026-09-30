/*
 * Base UI moves focus but never draws it. These are the rings, in one place, so
 * every control looks the same when focused or invalid.
 */

/**
 * For an element that is itself focusable.
 */
export const FOCUS_RING =
	"focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg";

/**
 * For an element that wraps the one taking focus.
 */
export const FOCUS_WITHIN_RING =
	"focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-bg";

/**
 * How an invalid control reads. Base UI sets `aria-invalid` itself.
 */
export const INVALID_RING =
	"aria-invalid:border-danger aria-invalid:ring-2 aria-invalid:ring-danger";

/**
 * The same, for an element containing an invalid control.
 */
export const INVALID_WITHIN_RING =
	"has-aria-invalid:border-danger has-aria-invalid:ring-2 has-aria-invalid:ring-danger";

/**
 * Disabled, covering both the HTML attribute and Base UI's own.
 */
export const DISABLED = "disabled:opacity-50 data-disabled:opacity-50";
