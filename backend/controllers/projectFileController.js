function createProjectFileControllers(dependencies) {
  const {
    getProjectFilePool,
    canAccessProject,
    toSafeProjectFile,
    sendServerError,
    isValidProjectFile,
    safeUnlink,
    stageProjectFile,
    resolveProjectFilePath,
    path,
    getProjectFileTransactionMarkerPath,
    listPendingProjectFiles,
    fs,
    promotePendingProjectFile,
    normalizeDateOrNull
  } = dependencies;

  async function listProjectFiles(req, res) {
    const projectId = String(req.params.projectId || '').trim();
    if (!projectId) return res.status(400).json({ ok: false, error: 'projectId is required' });
    try {
      const pool = getProjectFilePool();
      if (!await canAccessProject(pool, req, projectId)) {
        return res.status(403).json({ ok: false, error: 'You are not authorized to access this project.' });
      }
      const [rows] = await pool.query(
        'SELECT * FROM project_files WHERE project_id = ? ORDER BY created_at ASC',
        [projectId]
      );
      return res.json({ ok: true, files: rows.map(toSafeProjectFile) });
    } catch (error) {
      return sendServerError(res, error);
    }
  }

  async function uploadProjectFileContent(req, res) {
    const projectId = String(req.params.projectId || '').trim();
    const fileId = String(req.params.fileId || '').trim();
    if (!projectId || !fileId || !req.file) {
      if (req.file?.path) safeUnlink(req.file.path);
      return res.status(400).json({ ok: false, error: 'projectId, fileId, and file are required.' });
    }

    try {
      if (!isValidProjectFile(req.file)) {
        safeUnlink(req.file.path);
        return res.status(400).json({ ok: false, error: 'The uploaded project file type or contents are invalid.' });
      }
      await stageProjectFile(req.file.path, projectId, fileId);
      return res.json({ ok: true });
    } catch (error) {
      safeUnlink(req.file.path);
      return sendServerError(res, error);
    }
  }

  async function downloadProjectFileContent(req, res) {
    const projectId = String(req.params.projectId || '').trim();
    const fileId = String(req.params.fileId || '').trim();
    try {
      const pool = getProjectFilePool();
      if (!await canAccessProject(pool, req, projectId)) {
        return res.status(403).json({ ok: false, error: 'You are not authorized to access this project.' });
      }
      const [rows] = await pool.query(
        'SELECT file_name, content_key FROM project_files WHERE project_id = ? AND id = ? LIMIT 1',
        [projectId, fileId]
      );
      if (!rows.length) return res.status(404).json({ ok: false, error: 'File metadata was not found.' });
      const filePath = resolveProjectFilePath(projectId, fileId, rows[0].content_key);
      if (!filePath) return res.status(404).json({ ok: false, error: 'File content is not available.' });

      await pool.query(
        'UPDATE project_files SET download_count = download_count + 1 WHERE project_id = ? AND id = ?',
        [projectId, fileId]
      );
      res.set({
        'Content-Type': 'application/octet-stream',
        'Cache-Control': 'private, no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff'
      });
      return res.download(filePath, path.basename(rows[0].file_name));
    } catch (error) {
      return sendServerError(res, error);
    }
  }

  async function replaceProjectFiles(req, res) {
    const projectId = String(req.params.projectId || '').trim();
    const files = Array.isArray(req.body?.files) ? req.body.files : null;
    if (!projectId) return res.status(400).json({ ok: false, error: 'projectId is required' });
    if (!files) return res.status(400).json({ ok: false, error: 'files array is required' });

    let connection;
    let commitAttempted = false;
    let transactionCommitted = false;
    const promotedContentPaths = [];
    const transactionMarkerPaths = [];
    const pendingByFileId = new Map();
    try {
      for (const file of files) {
        const fileId = String(file?.id || '').trim();
        if (fileId) pendingByFileId.set(fileId, listPendingProjectFiles(projectId, fileId));
      }

      const pool = getProjectFilePool();
      if (!await canAccessProject(pool, req, projectId)) {
        return res.status(403).json({ ok: false, error: 'You are not authorized to access this project.' });
      }
      connection = await pool.getConnection();
      await connection.beginTransaction();
      await connection.query('SELECT id FROM projects WHERE id = ? FOR UPDATE', [projectId]);
      const [existingRows] = await connection.query(
        'SELECT id, content_key FROM project_files WHERE project_id = ? FOR UPDATE',
        [projectId]
      );
      const existingContentKeys = new Map(existingRows.map((row) => [String(row.id), row.content_key || null]));
      await connection.query('DELETE FROM project_files WHERE project_id = ?', [projectId]);

      for (const file of files) {
        const fileId = String(file?.id || `FILE-${Date.now()}-${Math.floor(Math.random() * 1000)}`).trim();
        const fileName = String(file?.fileName || '').trim();
        if (!fileName) continue;

        const stagedFiles = pendingByFileId.get(fileId) || [];
        const stagedFile = stagedFiles[0] || null;
        let contentKey = existingContentKeys.get(fileId) || null;
        if (stagedFile) {
          const markerPath = getProjectFileTransactionMarkerPath(stagedFile.contentKey);
          fs.writeFileSync(markerPath, 'prepared', { flag: 'wx' });
          transactionMarkerPaths.push(markerPath);
          const promotedPath = await promotePendingProjectFile(stagedFile);
          promotedContentPaths.push(promotedPath);
          contentKey = stagedFile.contentKey;
        }

        await connection.query(
          `INSERT INTO project_files
           (id, project_id, content_key, file_name, file_size, file_type, mime_type, uploaded_by, uploaded_by_name, uploaded_date, version, description, download_count, is_submitted, submitted_date, updated_date)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            fileId,
            projectId,
            contentKey,
            fileName,
            Number(file?.fileSize || 0),
            String(file?.fileType || 'other').trim() || 'other',
            String(file?.mimeType || '').trim() || null,
            String(file?.uploadedBy || '').trim() || null,
            String(file?.uploadedByName || '').trim() || null,
            normalizeDateOrNull(file?.uploadedDate),
            Math.max(1, Number(file?.version || 1)),
            String(file?.description || '').trim() || null,
            Math.max(0, Number(file?.downloadCount || 0)),
            file?.isSubmitted ? 1 : 0,
            normalizeDateOrNull(file?.submittedDate),
            normalizeDateOrNull(file?.updatedDate)
          ]
        );
      }

      const [rows] = await connection.query(
        'SELECT * FROM project_files WHERE project_id = ? ORDER BY created_at ASC',
        [projectId]
      );
      commitAttempted = true;
      await connection.commit();
      transactionCommitted = true;
      transactionMarkerPaths.forEach(safeUnlink);
      connection.release();
      connection = null;
      for (const stagedFiles of pendingByFileId.values()) {
        for (const stagedFile of stagedFiles) safeUnlink(stagedFile.path);
      }
      return res.json({ ok: true, files: rows.map(toSafeProjectFile) });
    } catch (error) {
      if (connection && !transactionCommitted && !commitAttempted) {
        await connection.rollback().catch(() => {});
      }
      if (connection) connection.release();
      if (!commitAttempted) {
        promotedContentPaths.forEach(safeUnlink);
        transactionMarkerPaths.forEach(safeUnlink);
      }
      for (const stagedFiles of pendingByFileId.values()) {
        stagedFiles.forEach((stagedFile) => safeUnlink(stagedFile.path));
      }
      return sendServerError(res, error);
    }
  }

  return {
    listProjectFiles,
    uploadProjectFileContent,
    downloadProjectFileContent,
    replaceProjectFiles
  };
}

module.exports = { createProjectFileControllers };
