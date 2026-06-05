import { initScheduler } from "./scheduler.server";

// Called as a side-effect import from server route handlers to ensure
// the scheduler is initialized on first server load.
initScheduler();
