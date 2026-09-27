const logger = require('../utils/logger');
const { syncAccessAttendance } = require('../services/accessAttendance.service');
const { expireMembershipJob } = require('./expireMembership.job');

let running = false;
async function runLocalJobs() {
  if (running) return;
  running = true;
  try {
    const expired = await expireMembershipJob();
    if (expired.length) logger.info(`Expired ${expired.length} membership(s)`);
    // This project receives biometric data through the separate Supabase sync
    // app. Enable direct Access reads only when this backend owns that sync.
    if (process.env.ACCESS_SYNC_ENABLED === 'true') {
      const attendance = await syncAccessAttendance();
      if (!attendance.disabled) logger.info(`Attendance sync: ${attendance.imported}/${attendance.found} imported`);
    }
  } catch (error) {
    logger.error(`Local gym sync failed: ${error.message}`);
  } finally { running = false; }
}

function startLocalJobs() {
  runLocalJobs();
  setInterval(runLocalJobs, 60 * 1000);
}
module.exports = { startLocalJobs };
