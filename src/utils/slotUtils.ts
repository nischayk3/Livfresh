/**
 * slotUtils.ts
 * Single source of truth for all time-slot logic.
 * Used by CartScreen (pickup scheduling) and OrderDetailScreen (delivery scheduling).
 */

// ─── Constants ────────────────────────────────────────────────────────────────

export const SLOT_CONSTANTS = {
    /** Store opens at 9:00 AM */
    OPERATIONAL_START_HOUR: 9,
    /** Store closes at 9:00 PM */
    OPERATIONAL_END_HOUR: 21,
    /**
     * Latest decimal time (hour + fractional minutes) at which an instant order
     * is accepted, INCLUDING the buffer.
     * 19.5 = 7:30 PM  →  last possible instant pickup at ~7:10 PM (7:30 - 20 min buffer)
     */
    LAST_INSTANT_CUTOFF_DECIMAL: 19.5,
    /**
     * The start of the last schedulable 1-hour slot (20:00 - 21:00).
     * Used to determine whether today still has any slots left.
     */
    LAST_SCHEDULED_SLOT_START_DECIMAL: 20.0,
    /** Minimum minutes ahead that a slot must start for it to be eligible */
    MIN_BUFFER_MINS: 20,
} as const;

// ─── Slot Generator ───────────────────────────────────────────────────────────

/**
 * Generates 12 × 1-hour time slot strings for a day (9 AM → 9 PM).
 *
 * Output: ["09:00 - 10:00", "10:00 - 11:00", ..., "20:00 - 21:00"]
 */
export const generateTimeSlots = (): string[] => {
    const slots: string[] = [];
    const { OPERATIONAL_START_HOUR, OPERATIONAL_END_HOUR } = SLOT_CONSTANTS;
    for (let i = OPERATIONAL_START_HOUR; i < OPERATIONAL_END_HOUR; i++) {
        const start = `${i.toString().padStart(2, '0')}:00`;
        const end = `${(i + 1).toString().padStart(2, '0')}:00`;
        slots.push(`${start} - ${end}`);
    }
    return slots;
};

// ─── Operating Hours Check ────────────────────────────────────────────────────

/**
 * Returns true if the current time (+ buffer) is within the instant-order
 * operating window: 9:00 AM to 7:30 PM.
 */
export const isInstantWithinHours = (): boolean => {
    const now = new Date();
    const hour = now.getHours();
    const mins = now.getMinutes();
    const { OPERATIONAL_START_HOUR, LAST_INSTANT_CUTOFF_DECIMAL, MIN_BUFFER_MINS } = SLOT_CONSTANTS;
    const decimalTimeWithBuffer = hour + (mins + MIN_BUFFER_MINS) / 60;
    return hour >= OPERATIONAL_START_HOUR && decimalTimeWithBuffer <= LAST_INSTANT_CUTOFF_DECIMAL;
};

// ─── Next Instant Slot ────────────────────────────────────────────────────────

/**
 * Returns the first slot string whose start time is at least `bufferMins`
 * from now, or null if none exists (too late in the day).
 *
 * @param slots  - ordered list of slot strings from generateTimeSlots()
 * @param bufferMins - minimum lead-time in minutes (default: SLOT_CONSTANTS.MIN_BUFFER_MINS)
 */
export const getNextInstantSlot = (
    slots: string[],
    bufferMins: number = SLOT_CONSTANTS.MIN_BUFFER_MINS
): string | null => {
    const now = new Date();
    const bufferTime = new Date(now.getTime() + bufferMins * 60_000);

    return slots.find(slot => {
        const [startStr] = slot.split(' - ');
        const [h, m] = startStr.split(':').map(Number);
        const slotStart = new Date();
        slotStart.setHours(h, m, 0, 0);
        return slotStart >= bufferTime;
    }) ?? null;
};

// ─── Slot Time Helpers ────────────────────────────────────────────────────────

/**
 * Given a slot string (e.g. "10:00 - 11:00") and a reference Date,
 * returns true if the slot's start time is in the past relative to
 * `referenceDate + bufferMins`.
 */
export const isSlotPast = (
    slot: string,
    referenceDate: Date,
    bufferMins: number = SLOT_CONSTANTS.MIN_BUFFER_MINS
): boolean => {
    const [startStr] = slot.split(' - ');
    const [h, m] = startStr.split(':').map(Number);
    const slotStart = new Date(referenceDate);
    slotStart.setHours(h, m, 0, 0);
    const cutoff = new Date(referenceDate.getTime() + bufferMins * 60_000);
    return slotStart < cutoff;
};
