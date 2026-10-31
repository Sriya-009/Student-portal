function createProfilePhotoControllers(dependencies) {
  const {
    getPool,
    isSelfOrAdmin,
    safeUnlink,
    hasValidImageSignature,
    path,
    uploadsDir,
    createPhotoUrl,
    sendServerError
  } = dependencies;

  async function uploadProfilePhoto(req, res) {
    try {
      if (!req.file) return res.status(400).json({ ok: false, error: 'No file provided' });
      const { identifier } = req.params;
      if (!identifier) {
        safeUnlink(req.file.path);
        return res.status(400).json({ ok: false, error: 'Identifier is required' });
      }
      if (!isSelfOrAdmin(req, identifier)) {
        safeUnlink(req.file.path);
        return res.status(403).json({ ok: false, error: 'You can only upload your own profile photo.' });
      }
      if (!hasValidImageSignature(req.file.path)) {
        safeUnlink(req.file.path);
        return res.status(400).json({ ok: false, error: 'The uploaded file is not a valid image.' });
      }

      const pool = getPool();
      const [rows] = await pool.query(
        'SELECT photo_url FROM users WHERE LOWER(identifier) = LOWER(?) LIMIT 1',
        [identifier]
      );
      if (!rows[0]) {
        safeUnlink(req.file.path);
        return res.status(404).json({ ok: false, error: 'User profile not found.' });
      }
      const previousPhotoPath = rows[0].photo_url;
      const photoUrl = `/uploads/profile-photos/${req.file.filename}`;
      await pool.query(
        'UPDATE users SET photo_url = ?, updated_at = NOW() WHERE identifier = ?',
        [photoUrl, identifier]
      );
      if (previousPhotoPath && path.basename(previousPhotoPath) !== req.file.filename) {
        safeUnlink(path.join(uploadsDir, path.basename(previousPhotoPath)));
      }
      return res.json({
        ok: true,
        message: 'Profile photo uploaded successfully',
        photoUrl: createPhotoUrl(photoUrl)
      });
    } catch (error) {
      if (req.file?.path) safeUnlink(req.file.path);
      return sendServerError(res, error);
    }
  }

  async function getProfilePhoto(req, res) {
    try {
      const { identifier } = req.params;
      if (!isSelfOrAdmin(req, identifier)) {
        return res.status(403).json({ ok: false, error: 'You can only view your own profile photo.' });
      }
      const [rows] = await getPool().query(
        'SELECT photo_url FROM users WHERE identifier = ?',
        [identifier]
      );
      if (!rows[0] || !rows[0].photo_url) return res.status(404).json({ ok: false, error: 'Photo not found' });
      return res.json({ ok: true, photoUrl: createPhotoUrl(rows[0].photo_url) });
    } catch (error) {
      return sendServerError(res, error);
    }
  }

  async function deleteProfilePhoto(req, res) {
    try {
      const { identifier } = req.params;
      if (!isSelfOrAdmin(req, identifier)) {
        return res.status(403).json({ ok: false, error: 'You can only delete your own profile photo.' });
      }
      const pool = getPool();
      const [rows] = await pool.query(
        'SELECT photo_url FROM users WHERE identifier = ?',
        [identifier]
      );
      if (rows[0]?.photo_url) {
        safeUnlink(path.join(uploadsDir, path.basename(String(rows[0].photo_url))));
      }
      await pool.query(
        'UPDATE users SET photo_url = NULL, updated_at = NOW() WHERE identifier = ?',
        [identifier]
      );
      return res.json({ ok: true, message: 'Profile photo deleted successfully' });
    } catch (error) {
      return sendServerError(res, error);
    }
  }

  return { uploadProfilePhoto, getProfilePhoto, deleteProfilePhoto };
}

module.exports = { createProfilePhotoControllers };
