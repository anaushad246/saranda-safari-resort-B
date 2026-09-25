import { Booking } from '../models/Booking.js';

/**
 * Periodically sweeps through the Booking collection to mark abandoned pending holds as 'expired'.
 *
 * NOTE: The availability engine NEVER depends on this sweeper running — the availability query
 * automatically filters out expired holds on-the-fly (`holdExpiresAt > now`).
 * This sweeper serves as clean operational housekeeping for the Executive Admin Ledger.
 */
export async function sweepExpiredPendingHolds() {
  try {
    const now = new Date();
    const result = await Booking.updateMany(
      {
        bookingStatus: 'pending',
        holdExpiresAt: { $lte: now }
      },
      {
        $set: {
          bookingStatus: 'expired'
        },
        $push: {
          statusHistory: {
            fromStatus: 'pending',
            toStatus: 'expired',
            changedBy: 'System Hold Sweeper',
            changedAt: now,
            reason: '2-hour pending hold expired without advance payment'
          }
        }
      }
    );

    if (result.modifiedCount > 0) {
      console.log(`[HoldSweeper]: Cleaned up ${result.modifiedCount} expired pending hold(s).`);
    }
  } catch (err) {
    console.error('[HoldSweeper Error]: Failed to sweep expired holds:', err.message);
  }
}

/**
 * Starts the periodic background sweeper timer.
 * Default interval: 10 minutes.
 */
export function startHoldSweeper(intervalMs = 10 * 60 * 1000) {
  // Run an immediate sweep on boot
  sweepExpiredPendingHolds();

  // Schedule recurring sweep
  const timer = setInterval(sweepExpiredPendingHolds, intervalMs);

  // Unref timer so it doesn't prevent Node process from graceful shutdown if needed
  if (timer.unref) {
    timer.unref();
  }

  console.log(`[HoldSweeper]: Background hold cleanup service initialized (interval: ${intervalMs / 60000}m).`);
  return timer;
}
