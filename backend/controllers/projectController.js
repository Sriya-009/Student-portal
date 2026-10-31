function createProjectControllers(dependencies) {
  const {
    getPool,
    findUserByIdentifierOrEmail,
    generateProjectIdentifier,
    normalizeDateOrNull,
    toSafeProject,
    toSafeProjectTask,
    toSafeFeedbackCorrection,
    canAccessProject,
    withTransaction,
    sendServerError
  } = dependencies;

  async function listProjects(req, res) {
    try {
      const pool = getPool();
      let query = 'SELECT * FROM projects ORDER BY updated_at DESC, created_at DESC LIMIT 200';
      let params = [];
      if (String(req.auth.role).toLowerCase() === 'student') {
        query = 'SELECT * FROM projects WHERE owner_identifier = ? ORDER BY updated_at DESC, created_at DESC LIMIT 200';
        params = [req.auth.sub];
      } else if (String(req.auth.role).toLowerCase() === 'faculty') {
        query = `SELECT p.*
          FROM projects p
          INNER JOIN users s ON s.identifier = p.owner_identifier
          WHERE s.assigned_faculty_identifier = ?
          ORDER BY p.updated_at DESC, p.created_at DESC LIMIT 200`;
        params = [req.auth.sub];
      }
      const [rows] = await pool.query(query, params);
      return res.json({ ok: true, projects: rows.map(toSafeProject) });
    } catch (error) {
      return sendServerError(res, error);
    }
  }

  async function createProject(req, res) {
    const name = String(req.body?.name || '').trim();
    const description = String(req.body?.description || '').trim();
    const ownerIdentifier = String(req.auth.sub || '').trim();
    const department = String(req.body?.department || '').trim();
    const deadline = normalizeDateOrNull(req.body?.deadline);

    if (!name) return res.status(400).json({ ok: false, error: 'Project name is required' });
    if (!ownerIdentifier) return res.status(400).json({ ok: false, error: 'ownerIdentifier is required' });

    try {
      const pool = getPool();
      const owner = await findUserByIdentifierOrEmail(pool, ownerIdentifier);
      if (!owner || String(owner.role || '').toLowerCase() !== 'student') {
        return res.status(404).json({ ok: false, error: 'Student owner account not found' });
      }

      const projectId = generateProjectIdentifier();
      await pool.query(
        `INSERT INTO projects (id, name, description, department, status, progress_percent, deadline, owner_identifier)
         VALUES (?, ?, ?, ?, 'ongoing', 0, ?, ?)`,
        [projectId, name, description || null, department || owner.department || null, deadline, owner.identifier]
      );
      const [rows] = await pool.query('SELECT * FROM projects WHERE id = ? LIMIT 1', [projectId]);
      return res.status(201).json({ ok: true, project: toSafeProject(rows[0]) });
    } catch (error) {
      return sendServerError(res, error);
    }
  }

  async function deleteProject(req, res) {
    const projectId = String(req.params.projectId || '').trim();
    const ownerIdentifier = String(req.auth.sub || '').trim();
    if (!projectId) return res.status(400).json({ ok: false, error: 'projectId is required' });
    if (!ownerIdentifier) return res.status(400).json({ ok: false, error: 'ownerIdentifier is required' });

    try {
      const pool = getPool();
      const [rows] = await pool.query('SELECT * FROM projects WHERE id = ? LIMIT 1', [projectId]);
      const project = rows[0];
      if (!project) return res.status(404).json({ ok: false, error: 'Project not found' });
      if (String(req.auth.role).toLowerCase() !== 'admin'
        && String(project.owner_identifier || '').toLowerCase() !== ownerIdentifier.toLowerCase()) {
        return res.status(403).json({ ok: false, error: 'You can only delete your own projects' });
      }
      await pool.query('DELETE FROM projects WHERE id = ?', [projectId]);
      return res.json({ ok: true, deletedProjectId: projectId });
    } catch (error) {
      return sendServerError(res, error);
    }
  }

  async function listProjectTasks(req, res) {
    const projectId = String(req.params.projectId || '').trim();
    if (!projectId) return res.status(400).json({ ok: false, error: 'projectId is required' });
    try {
      const pool = getPool();
      if (!await canAccessProject(pool, req, projectId)) {
        return res.status(403).json({ ok: false, error: 'You are not authorized to access this project.' });
      }
      const [rows] = await pool.query(
        'SELECT * FROM project_tasks WHERE project_id = ? ORDER BY created_at ASC',
        [projectId]
      );
      return res.json({ ok: true, tasks: rows.map(toSafeProjectTask) });
    } catch (error) {
      return sendServerError(res, error);
    }
  }

  async function replaceProjectTasks(req, res) {
    const projectId = String(req.params.projectId || '').trim();
    const tasks = Array.isArray(req.body?.tasks) ? req.body.tasks : null;
    if (!projectId) return res.status(400).json({ ok: false, error: 'projectId is required' });
    if (!tasks) return res.status(400).json({ ok: false, error: 'tasks array is required' });

    let connection;
    try {
      connection = await getPool().getConnection();
      await connection.beginTransaction();
      const [projectRows] = await connection.query(
        'SELECT id FROM projects WHERE id = ? LIMIT 1 FOR UPDATE',
        [projectId]
      );
      if (projectRows.length === 0 || !await canAccessProject(connection, req, projectId)) {
        await connection.rollback();
        connection.release();
        connection = null;
        return res.status(403).json({ ok: false, error: 'You are not authorized to access this project.' });
      }
      await connection.query('DELETE FROM project_tasks WHERE project_id = ?', [projectId]);
      for (const task of tasks) {
        const taskId = String(task?.id || `TSK-${Date.now()}-${Math.floor(Math.random() * 1000)}`).trim();
        const title = String(task?.title || '').trim();
        if (!title) continue;
        await connection.query(
          `INSERT INTO project_tasks
           (id, project_id, title, description, assigned_to_id, assigned_to_name, status, deadline, contribution_percent)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            taskId,
            projectId,
            title,
            String(task?.description || '').trim() || null,
            String(task?.assignedToId || '').trim() || null,
            String(task?.assignedToName || '').trim() || null,
            String(task?.status || 'pending').trim() || 'pending',
            normalizeDateOrNull(task?.deadline),
            Math.min(100, Math.max(0, Number(task?.contributionPercent || 0)))
          ]
        );
      }
      const [rows] = await connection.query(
        'SELECT * FROM project_tasks WHERE project_id = ? ORDER BY created_at ASC',
        [projectId]
      );
      await connection.commit();
      connection.release();
      connection = null;
      return res.json({ ok: true, tasks: rows.map(toSafeProjectTask) });
    } catch (error) {
      if (connection) {
        await connection.rollback().catch(() => {});
        connection.release();
      }
      return sendServerError(res, error);
    }
  }

  async function listFeedbackCorrections(req, res) {
    const projectId = String(req.params.projectId || '').trim();
    if (!projectId) return res.status(400).json({ ok: false, error: 'projectId is required' });
    try {
      const pool = getPool();
      if (!await canAccessProject(pool, req, projectId)) {
        return res.status(403).json({ ok: false, error: 'You are not authorized to access this project.' });
      }
      const [rows] = await pool.query(
        'SELECT * FROM project_feedback_corrections WHERE project_id = ? ORDER BY created_at DESC',
        [projectId]
      );
      return res.json({ ok: true, corrections: rows.map(toSafeFeedbackCorrection) });
    } catch (error) {
      return sendServerError(res, error);
    }
  }

  async function createFeedbackCorrection(req, res) {
    const projectId = String(req.params.projectId || '').trim();
    const studentIdentifier = String(req.body?.studentIdentifier || '').trim();
    const note = String(req.body?.note || '').trim();
    if (!projectId) return res.status(400).json({ ok: false, error: 'projectId is required' });
    if (!note) return res.status(400).json({ ok: false, error: 'note is required' });
    try {
      const pool = getPool();
      if (!await canAccessProject(pool, req, projectId)) {
        return res.status(403).json({ ok: false, error: 'You are not authorized to access this project.' });
      }
      const correctionId = `CORR-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const rows = await withTransaction(pool, async (connection) => {
        await connection.query(
          `INSERT INTO project_feedback_corrections (id, project_id, student_identifier, note)
           VALUES (?, ?, ?, ?)`,
          [correctionId, projectId, studentIdentifier || null, note]
        );
        const [insertedRows] = await connection.query(
          'SELECT * FROM project_feedback_corrections WHERE id = ? LIMIT 1',
          [correctionId]
        );
        return insertedRows;
      });
      return res.status(201).json({ ok: true, correction: toSafeFeedbackCorrection(rows[0]) });
    } catch (error) {
      return sendServerError(res, error);
    }
  }

  return {
    listProjects,
    createProject,
    deleteProject,
    listProjectTasks,
    replaceProjectTasks,
    listFeedbackCorrections,
    createFeedbackCorrection
  };
}

module.exports = { createProjectControllers };
