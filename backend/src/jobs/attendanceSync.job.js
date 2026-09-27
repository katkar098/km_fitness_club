const { query } = require('../config/db');
const logger = require('../utils/logger');
const { supabase } = require('../config/supabase');

const attendanceSyncJob = async () => {
  try {
    logger.info('Starting attendance sync job...');

    // Get pending attendance records from Supabase
    // This is a mock implementation - replace with actual Supabase sync logic
    const { data: pendingAttendance, error } = await supabase
      .from('pending_attendance')
      .select('*')
      .eq('synced', false)
      .limit(100);

    if (error) {
      throw error;
    }

    if (pendingAttendance && pendingAttendance.length > 0) {
      for (const record of pendingAttendance) {
        // Insert into local database
        await query(`
          INSERT INTO attendance (id, member_id, check_in, check_out, status, verification_method)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (id) DO UPDATE SET
            check_out = EXCLUDED.check_out,
            status = EXCLUDED.status,
            updated_at = CURRENT_TIMESTAMP
        `, [
          record.id,
          record.member_id,
          record.check_in,
          record.check_out,
          record.status || 'present',
          record.verification_method || 'biometric'
        ]);

        // Mark as synced
        await supabase
          .from('pending_attendance')
          .update({ synced: true, synced_at: new Date().toISOString() })
          .eq('id', record.id);

        logger.info(`Synced attendance record: ${record.id}`);
      }

      logger.info(`Synced ${pendingAttendance.length} attendance records`);
    }

    return pendingAttendance;
  } catch (error) {
    logger.error('Error in attendanceSyncJob:', error);
    throw error;
  }
};

module.exports = {
  attendanceSyncJob
};