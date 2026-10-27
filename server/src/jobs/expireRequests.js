import cron from 'node-cron';
import ServiceRequest from '../models/ServiceRequest.js';

/**
 * Expire pending requests older than 48 hours.
 * Can be called periodically by cron or lazily before request retrieval.
 */
export const expireOldRequests = async () => {
  try {
    const thresholdDate = new Date(Date.now() - 48 * 60 * 60 * 1000);

    const result = await ServiceRequest.updateMany(
      {
        status: 'PENDING',
        createdAt: { $lt: thresholdDate },
      },
      {
        $set: { status: 'EXPIRED' },
        $push: {
          statusHistory: {
            status: 'EXPIRED',
            changedBy: null,
            at: new Date(),
            note: 'Auto-expired after 48 hours with no response',
          },
        },
      }
    );

    if (result.modifiedCount > 0) {
      console.log(`[Expiry Job] Auto-expired ${result.modifiedCount} overdue pending requests.`);
    }

    return result.modifiedCount;
  } catch (error) {
    console.error('[Expiry Job Error] Failed to expire overdue requests:', error.message);
    return 0;
  }
};

/**
 * Initializes the node-cron scheduled job to run every hour at minute 0.
 */
export const startExpiryCron = () => {
  // Runs every hour ("0 * * * *")
  const job = cron.schedule('0 * * * *', async () => {
    console.log('[Expiry Job] Executing scheduled request expiry check...');
    await expireOldRequests();
  });

  console.log('[Cron] Request expiry background job scheduled (every hour: 0 * * * *).');
  return job;
};

export default {
  expireOldRequests,
  startExpiryCron,
};
