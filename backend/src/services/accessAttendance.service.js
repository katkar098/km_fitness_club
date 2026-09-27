const { query } = require('../config/db');

function accessIdentifier(value) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value || '')) throw new Error('Invalid Access table or column configuration');
  return `[${value}]`;
}

function accessDate(value) {
  return new Date(value).toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
}

function normalizeMemberKey(value) {
  if (value === null || value === undefined) return '';
  const text = String(value).trim().toLowerCase();
  if (!text) return '';
  return text.replace(/^0+(\d)/, '$1');
}

function numericKey(value) {
  if (value === null || value === undefined) return null;
  const cleaned = String(value).trim();
  if (!cleaned) return null;
  const digits = cleaned.replace(/\D+/g, '');
  if (!digits) return null;
  return Number(digits);
}

// ETimeTrackLite installations can use either the 64-bit or 32-bit Microsoft
// Access Database Engine. Try the modern 64-bit driver first, then retain a
// 32-bit fallback for older installations.
async function queryAccessDatabase(sql) {
  const ADODB = require('node-adodb');
  const connection = `Provider=Microsoft.ACE.OLEDB.12.0;Data Source=${process.env.ACCESS_DB_PATH};Persist Security Info=False;`;

  try {
    return await ADODB.open(connection, true).query(sql);
  } catch (x64Error) {
    try {
      return await ADODB.open(connection, false).query(sql);
    } catch (x86Error) {
      x86Error.message = `Unable to read ETimeTrackLite with either Access driver. 64-bit: ${x64Error.message}; 32-bit: ${x86Error.message}`;
      throw x86Error;
    }
  }
}

// Reads the user master table in ETimeTrackLite. This is separate from punch
// import so an admin can enroll a biometric user before that person has a
// first attendance record.
async function getAccessBiometricUsers() {
  if (!process.env.ACCESS_DB_PATH) return { disabled: true, users: [] };

  const table = accessIdentifier(process.env.ACCESS_USER_TABLE || 'USERINFO');
  const id = accessIdentifier(process.env.ACCESS_USER_ID_COLUMN || 'USERID');
  const name = accessIdentifier(process.env.ACCESS_USER_NAME_COLUMN || 'EmployeeName');
  const rows = await queryAccessDatabase(`select distinct ${id} as biometric_user_id, ${name} as full_name from ${table} where ${id} is not null order by ${name}, ${id}`);

  return {
    disabled: false,
    users: rows
      .map((row) => ({
        biometric_user_id: String(row.biometric_user_id ?? '').trim(),
        full_name: String(row.full_name ?? '').trim(),
      }))
      .filter((user) => user.biometric_user_id),
  };
}

async function resolveMemberId(memberCode, biometricUserId) {
  const candidates = [memberCode, biometricUserId]
    .filter(Boolean)
    .map((value) => String(value).trim())
    .filter(Boolean);

  if (!candidates.length) return null;

  const { rows } = await query(`
    select id, member_code, biometric_user_id
    from members
    where created_by_admin_id is not null
      and (member_code is not null or biometric_user_id is not null)
  `);

  const direct = rows.find((member) => {
    const keys = [member.member_code, member.biometric_user_id].filter(Boolean);
    return keys.some((value) => {
      const valueText = normalizeMemberKey(value);
      return candidates.some((candidate) => normalizeMemberKey(candidate) === valueText);
    });
  });

  if (direct) return direct.id;

  const numericMatch = rows.find((member) => {
    const numbers = [member.member_code, member.biometric_user_id].map(numericKey).filter((n) => n !== null);
    return numbers.some((num) => candidates.some((candidate) => numericKey(candidate) === num));
  });

  if (numericMatch) return numericMatch.id;

  return null;
}

async function repairUnmatchedAttendance() {
  const { rows } = await query(`
    select distinct member_code
    from attendance_events
    where member_id is null
    order by member_code
  `);

  let repaired = 0;

  for (const row of rows) {
    const memberCode = row.member_code;
    const memberId = await resolveMemberId(memberCode, memberCode);
    if (!memberId) continue;

    await query(`
      update attendance_events
      set member_id = $1
      where member_id is null and member_code = $2
    `, [memberId, memberCode]);

    repaired += 1;
  }

  return repaired;
}

async function syncAccessAttendance() {
  if (!process.env.ACCESS_DB_PATH) return { disabled: true, found: 0, imported: 0, repaired: 0 };
  // Loaded only on the local ETimeTrackLite machine. node-adodb needs Windows + ACE provider.
  const deviceId = process.env.BIOMETRIC_DEVICE_ID || 'ETIMETRACKLITE-01';
  const last = await query(`select coalesce(max(punched_at), '2000-01-01'::timestamptz) as value from attendance_events where device_id=$1`, [deviceId]);
  const table = accessIdentifier(process.env.ACCESS_TABLE);
  const id = accessIdentifier(process.env.ACCESS_LOG_ID_COLUMN);
  const member = accessIdentifier(process.env.ACCESS_MEMBER_ID_COLUMN);
  const time = accessIdentifier(process.env.ACCESS_TIME_COLUMN);
  const type = accessIdentifier(process.env.ACCESS_PUNCH_TYPE_COLUMN);
  const rows = await queryAccessDatabase(`select ${id} as source_record_id, ${member} as member_code, ${time} as punched_at, ${type} as punch_type from ${table} where ${time} >= #${accessDate(last.rows[0].value)}# order by ${time}, ${id}`);

  let imported = 0;
  const unresolved = [];

  for (const row of rows) {
    const rawMemberCode = String(row.member_code ?? '').trim();
    const resolvedMemberId = await resolveMemberId(rawMemberCode, rawMemberCode);

    if (!resolvedMemberId) {
      unresolved.push(rawMemberCode || '(empty)');
    }

    const result = await query(`insert into attendance_events(device_id,source_record_id,member_code,member_id,punched_at,punch_type,raw_payload)
      values($1,$2,$3,$4,$5,$6,$7)
      on conflict(device_id,source_record_id) do nothing`, [deviceId, String(row.source_record_id), rawMemberCode || null, resolvedMemberId || null, new Date(row.punched_at).toISOString(), row.punch_type ? String(row.punch_type) : null, row]);
    imported += result.rowCount;
  }

  const repaired = await repairUnmatchedAttendance();

  if (unresolved.length) {
    console.warn('Unresolved biometric member codes:', [...new Set(unresolved)].slice(0, 20));
  }

  return { disabled: false, found: rows.length, imported, repaired };
}

module.exports = { syncAccessAttendance, getAccessBiometricUsers, resolveMemberId, repairUnmatchedAttendance };
