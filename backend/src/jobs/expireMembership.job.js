const { transaction } = require('../config/db');

function queueBiometricAccessChange(db, memberId, action) {
  const allowedActions = new Set(['enable', 'disable']);
  if (!allowedActions.has(action)) {
    throw new Error(`Unsafe biometric action requested: ${action}`);
  }

  return db.query(`
    insert into biometric_sync_queue(member_id, action)
    select $1, $2
    where not exists (
      select 1
      from biometric_sync_queue
      where member_id = $1
        and action = $2
        and status in ('pending', 'processing')
    )
  `, [memberId, action]);
}

async function expireMembershipJob() {
  return transaction(async (db) => {
    const expired = await db.query(`update memberships set status='expired' where status='active' and end_date < current_date returning member_id`);
    const ids = [...new Set(expired.rows.map((row) => row.member_id))];
    for (const id of ids) {
      await db.query(`update members set status='expired', biometric_access_enabled=false where id=$1`, [id]);
      await queueBiometricAccessChange(db, id, 'disable');
    }
    return ids;
  });
}

module.exports = { expireMembershipJob, queueBiometricAccessChange };
