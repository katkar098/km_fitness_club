const { query } = require('../config/db');
const logger = require('../utils/logger');
const { supabase } = require('../config/supabase');

const biometricSyncJob = async () => {
  try {
    logger.info('Starting biometric sync job...');

    // Get pending biometric data from Supabase
    const { data: pendingBiometric, error } = await supabase
      .from('pending_biometric')
      .select('*')
      .eq('synced', false)
      .limit(50);

    if (error) {
      throw error;
    }

    if (pendingBiometric && pendingBiometric.length > 0) {
      for (const record of pendingBiometric) {
        // Update biometric data in local database
        await query(`
          UPDATE biometric_data 
          SET biometric_data = $1,
              template_id = $2,
              updated_at = CURRENT_TIMESTAMP
          WHERE member_id = $3 AND biometric_type = $4
        `, [
          record.biometric_data,
          record.template_id,
          record.member_id,
          record.biometric_type
        ]);

        // Mark as synced
        await supabase
          .from('pending_biometric')
          .update({ synced: true, synced_at: new Date().toISOString() })
          .eq('id', record.id);

        logger.info(`Synced biometric data for member: ${record.member_id}`);
      }

      logger.info(`Synced ${pendingBiometric.length} biometric records`);
    }

    return pendingBiometric;
  } catch (error) {
    logger.error('Error in biometricSyncJob:', error);
    throw error;
  }
};

module.exports = {
  biometricSyncJob
};