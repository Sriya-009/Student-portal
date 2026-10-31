function createProfileControllers(dependencies) {
  const {
    getPool,
    findUserByIdentifierOrEmail,
    toSafeUser,
    sendServerError,
    isSelfOrAdmin,
    profileFieldMap,
    toDbPatchValue,
    requireRoles,
    withTransaction,
    syncUserIntoRoleTables
  } = dependencies;

  async function getProfile(req, res) {
    const identifier = String(req.params.identifier || '').trim();
    if (!identifier) return res.status(400).json({ ok: false, error: 'identifier is required' });
    if (!isSelfOrAdmin(req, identifier)) {
      return res.status(403).json({ ok: false, error: 'You can only view your own profile.' });
    }
    try {
      const user = await findUserByIdentifierOrEmail(getPool(), identifier);
      if (!user) return res.status(404).json({ ok: false, error: 'User profile not found' });
      return res.json({ ok: true, user: toSafeUser(user) });
    } catch (error) {
      return sendServerError(res, error);
    }
  }

  async function patchProfile(req, res) {
    const identifier = String(req.params.identifier || '').trim();
    if (!identifier) return res.status(400).json({ ok: false, error: 'identifier is required' });
    if (!isSelfOrAdmin(req, identifier)) {
      return res.status(403).json({ ok: false, error: 'You can only update your own profile.' });
    }

    const updates = [];
    const params = [];
    const adminOnlyFields = new Set([
      'accessLevel',
      'permissions',
      'isActive',
      'twoFactorEnabled',
      'emergencyContact'
    ]);
    Object.keys(req.body || {}).forEach((inputKey) => {
      const dbField = profileFieldMap[inputKey];
      if (!dbField || (adminOnlyFields.has(inputKey) && String(req.auth.role).toLowerCase() !== 'admin')) return;
      const dbValue = toDbPatchValue(inputKey, req.body[inputKey]);
      if (dbValue === undefined) return;
      updates.push(`${dbField} = ?`);
      params.push(dbValue);
    });

    if (updates.length === 0) return res.status(400).json({ ok: false, error: 'No valid profile fields provided' });

    try {
      const updatedUser = await withTransaction(getPool(), async (connection) => {
        const [updateResult] = await connection.query(
          `UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE LOWER(identifier) = LOWER(?)`,
          [...params, identifier]
        );
        if (!updateResult.affectedRows) return null;
        const user = await findUserByIdentifierOrEmail(connection, identifier);
        if (user) await syncUserIntoRoleTables(connection, user);
        return user;
      });
      if (!updatedUser) return res.status(404).json({ ok: false, error: 'User profile not found after update' });
      return res.json({ ok: true, user: toSafeUser(updatedUser) });
    } catch (error) {
      return sendServerError(res, error);
    }
  }

  return { getProfile, patchProfile };
}

module.exports = { createProfileControllers };
