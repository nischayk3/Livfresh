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
    /** Maximum orders (pickup + delivery combined) per 1-hour slot */
    MAX_ORDERS_PER_SLOT: 2,
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

// ─── Instant Slot ─────────────────────────────────────────────────────────────

/**
 * Returns the VERY NEXT 1-hour slot (currentHour + 1), or null if
 * that slot falls outside operational hours.
 *
 * The instant order is only valid for the immediately next slot.
 * If that slot is full or doesn't exist, instant must be disabled.
 */
export const getNextInstantSlot = (slots: string[]): string | null => {
    const now = new Date();
    const nextHour = now.getHours() + 1;
    const { OPERATIONAL_START_HOUR, OPERATIONAL_END_HOUR } = SLOT_CONSTANTS;

    // Next hour must be within operational window
    if (nextHour < OPERATIONAL_START_HOUR || nextHour >= OPERATIONAL_END_HOUR) return null;

    const slotStr = `${nextHour.toString().padStart(2, '0')}:00 - ${(nextHour + 1).toString().padStart(2, '0')}:00`;

    // Verify the slot exists in the generated list
    return slots.includes(slotStr) ? slotStr : null;
};

// ─── Slot Time Helpers ────────────────────────────────────────────────────────

/**
 * Given a slot string (e.g. "10:00 - 11:00") and a reference Date,
 * returns true if the slot's start time has already passed
 * (i.e. the slot has already started or is in the past).
 */
export const isSlotPast = (
    slot: string,
    referenceDate: Date,
): boolean => {
    const [startStr] = slot.split(' - ');
    const [h, m] = startStr.split(':').map(Number);
    const slotStart = new Date(referenceDate);
    slotStart.setHours(h, m, 0, 0);
    return slotStart <= referenceDate;
};
