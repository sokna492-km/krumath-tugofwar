/** Net pulls from center required to win. Shared by rope UI and game rules. */
export const WIN_PULLS = 8;

/** Wrong-answer shake duration (ms). Host local + DO-owned clear. */
export const SHAKE_MS = 350;

/** Max controller actions accepted per window (abuse guard). */
export const CONTROLLER_RATE_LIMIT = 40;
export const CONTROLLER_RATE_WINDOW_MS = 2000;
