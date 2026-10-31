const roleTableDefinitions = {
  student: {
    table: 'student',
    identifierColumn: 'registration_no',
    columns: [
      'registration_no', 'name', 'email', 'password', 'course', 'semester', 'section',
      'batch_year', 'date_of_birth', 'guardian_name', 'guardian_phone', 'address',
      'profile_photo_url', 'is_active', 'must_reset_password'
    ],
    values: (user, identifier, email, password) => [
      identifier, user.name, email, password, user.department || null, user.semester,
      user.section || null, user.batch_year, user.date_of_birth || null,
      user.guardian_name || null, user.guardian_phone || null, user.address || null,
      user.photo_url || null, user.is_active === undefined ? 1 : (user.is_active ? 1 : 0),
      user.must_reset_password ? 1 : 0
    ]
  },
  faculty: {
    table: 'faculty',
    identifierColumn: 'employee_id',
    columns: [
      'employee_id', 'name', 'email', 'password', 'department', 'designation',
      'specialization', 'qualification', 'office_location', 'office_hours', 'joining_date',
      'bio', 'profile_photo_url', 'is_active', 'must_reset_password'
    ],
    values: (user, identifier, email, password) => [
      identifier, user.name, email, password, user.department || null, user.designation || null,
      user.specialization || null, user.qualification || null, user.office_location || null,
      user.office_hours || null, user.joining_date || null, user.bio || null, user.photo_url || null,
      user.is_active === undefined ? 1 : (user.is_active ? 1 : 0), user.must_reset_password ? 1 : 0
    ]
  },
  admin: {
    table: 'admin',
    identifierColumn: 'employee_id',
    columns: [
      'employee_id', 'name', 'email', 'password', 'role', 'access_level', 'permissions_json',
      'two_factor_enabled', 'emergency_contact', 'is_active', 'must_reset_password'
    ],
    values: (user, identifier, email, password) => {
      const parsedAccessLevel = Number(user.access_level);
      return [
        identifier, user.name, email, password, 'admin', parsedAccessLevel,
        serializePermissions(user.permissions_json), user.two_factor_enabled ? 1 : 0,
        user.emergency_contact || null,
        user.is_active === undefined ? 1 : (user.is_active ? 1 : 0),
        user.must_reset_password ? 1 : 0
      ];
    }
  }
};

function getRoleTableDefinition(role) {
  return roleTableDefinitions[String(role || '').trim().toLowerCase()] || null;
}

function parseNullableInteger(value) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const text = String(value).trim();
  if (!/^-?\d+$/.test(text)) return undefined;
  const parsed = Number(text);
  return Number.isSafeInteger(parsed) && parsed >= -2147483648 && parsed <= 2147483647
    ? parsed
    : undefined;
}

function parseNullableYear(value) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const text = String(value).trim();
  if (!/^\d{4}$/.test(text)) return undefined;
  const year = Number(text);
  return year === 0 || (year >= 1901 && year <= 2155) ? year : undefined;
}

function serializePermissions(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'string') {
    try {
      JSON.parse(value);
      return value;
    } catch (_error) {
      return undefined;
    }
  }
  try {
    return JSON.stringify(value);
  } catch (_error) {
    return undefined;
  }
}

function fits(value, maximum) {
  return value === null || value === undefined || String(value).length <= maximum;
}

function prepareRoleTableUser(user, role, identifier, email) {
  const normalized = { ...user };
  normalized.semester = null;
  normalized.batch_year = null;
  if (role === 'student') {
    normalized.semester = parseNullableInteger(user.semester);
    normalized.batch_year = parseNullableYear(user.batch_year);
    if (normalized.semester === undefined || normalized.batch_year === undefined) return null;
    if (!fits(user.department, 100) || !fits(user.section, 10)
      || !fits(user.guardian_name, 100) || !fits(user.guardian_phone, 15)
      || !fits(user.photo_url, 255)) return null;
  } else if (role === 'faculty') {
    if (!fits(user.department, 100) || !fits(user.designation, 100)
      || !fits(user.specialization, 100) || !fits(user.qualification, 100)
      || !fits(user.office_location, 150) || !fits(user.office_hours, 100)
      || !fits(user.photo_url, 255)) return null;
  } else if (role === 'admin') {
    normalized.access_level = parseNullableInteger(user.access_level);
    normalized.permissions_json = serializePermissions(user.permissions_json);
    if (normalized.access_level === undefined || normalized.permissions_json === undefined
      || !fits(user.emergency_contact, 15)) return null;
  }

  const definition = roleTableDefinitions[role];
  const limits = {
    identifier: 50,
    name: 100,
    email: 100,
    password: 100
  };
  const password = typeof user.password === 'string' && /^\$2[aby]\$\d{2}\$/.test(user.password)
    ? user.password
    : null;
  if (!fits(identifier, limits.identifier) || !fits(user.name, limits.name)
    || !fits(email, limits.email) || !fits(password, limits.password)) return null;

  return { definition, user: normalized, password };
}

async function syncUserIntoRoleTables(queryClient, user) {
  const role = String(user?.role || '').trim().toLowerCase();
  const definition = getRoleTableDefinition(role);
  const identifier = String(user?.identifier || '').trim();
  const emailText = String(user?.email || '').trim().toLowerCase();
  const email = emailText || null;
  const name = String(user?.name || '').trim();

  if (!definition || !identifier || !name) return false;

  const prepared = prepareRoleTableUser(user, role, identifier, email);
  if (!prepared) return false;
  const placeholders = definition.columns.map(() => '?').join(', ');
  const sql = `INSERT INTO ${definition.table} (${definition.columns.join(', ')})
    VALUES (${placeholders})
    ON DUPLICATE KEY UPDATE ${definition.identifierColumn} = ${definition.identifierColumn}`;

  await queryClient.query(sql, definition.values(prepared.user, identifier, email, prepared.password));
  return true;
}

function normalizeRoleTableUser(row, role) {
  const definition = getRoleTableDefinition(role);
  if (!row || !definition) return null;
  const identifier = row[definition.identifierColumn];
  if (!identifier) return null;

  return {
    ...row,
    id: null,
    roleTableId: row.id ?? null,
    accountSource: 'role_table',
    identifier: String(identifier),
    role,
    // Legacy role schemas allow NULL here; treat it as disabled. Canonical
    // users rows have their own NOT NULL flag and do not use this normalizer.
    is_active: row.is_active === undefined || row.is_active === null ? 0 : row.is_active,
    must_reset_password: row.must_reset_password || 0,
    phone: row.phone || row.phone_number || null
  };
}

async function findRoleTableUser(pool, identifier, role = null) {
  const normalized = String(identifier || '').trim().toLowerCase();
  if (!normalized) return null;

  const roles = role
    ? [String(role).trim().toLowerCase()]
    : ['admin', 'faculty', 'student'];

  const matches = [];
  for (const currentRole of roles) {
    const definition = getRoleTableDefinition(currentRole);
    if (!definition) continue;
    const [rows] = await pool.query(
      `SELECT * FROM ${definition.table}
       WHERE LOWER(${definition.identifierColumn}) = ? OR LOWER(email) = ?
       LIMIT 1`,
      [normalized, normalized]
    );
    if (rows[0]) {
      matches.push(normalizeRoleTableUser(rows[0], currentRole));
    }
  }

  // Old schemas can contain the same account in multiple role tables. Do not
  // resolve that ambiguity by preferring the more privileged role.
  if (matches.length !== 1) return null;
  return matches[0];
}

async function updateRoleTablePassword(queryClient, user, passwordHash, mustResetPassword = 0) {
  const role = String(user?.role || '').trim().toLowerCase();
  const definition = getRoleTableDefinition(role);
  const identifier = String(user?.identifier || '').trim();
  const email = String(user?.email || '').trim().toLowerCase() || null;
  if (!definition || !identifier || user?.accountSource !== 'role_table') {
    throw new Error('Role-table password target is invalid.');
  }

  const [result] = await queryClient.query(
    `UPDATE ${definition.table}
     SET password = ?, must_reset_password = ?, updated_at = CURRENT_TIMESTAMP
     WHERE ${definition.identifierColumn} = ? AND email <=> ?`,
    [passwordHash, mustResetPassword ? 1 : 0, identifier, email]
  );
  if (!result?.affectedRows) throw new Error('Role-table account was not found for password update.');
  return result;
}

module.exports = {
  findRoleTableUser,
  getRoleTableDefinition,
  normalizeRoleTableUser,
  syncUserIntoRoleTables,
  updateRoleTablePassword
};
