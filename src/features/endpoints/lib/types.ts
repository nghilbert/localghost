import type { z } from "zod/v4";
import type { modelSelectionSchema } from "./schemas";

/** A chosen model on a specific endpoint. The unit the composer reads and writes. */
export type ModelSelection = z.infer<typeof modelSelectionSchema>;
