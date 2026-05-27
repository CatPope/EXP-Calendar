// Shared UI-related constants. Keep values aligned with existing behavior;
// changing these alters timing visible to the user.

/** Lifetime of a generic info/success/error toast (components/common/ToastHost.tsx). */
export const TOAST_DURATION_MS = 4000;

/** Duration the reward toast stays fully visible before fade-out begins. */
export const REWARD_TOAST_VISIBLE_MS = 3500;

/** Delay after fade-out begins before the reward state is cleared. */
export const REWARD_TOAST_HIDE_DELAY_MS = 200;
