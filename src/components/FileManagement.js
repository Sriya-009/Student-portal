import { useState, useMemo, useEffect } from 'react';

function FileManagement({ projectId, projectLeadId, currentUserId, teamMembers, projectFiles, onFilesUpdate, projectName, actionMode }) {
  const [files, setFiles] = useState(projectFiles || []);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [fileVersion, setFileVersion] = useState('');
  const [editFileId, setEditFileId] = useState(null);
  const [editDescription, setEditDescription] = useState('');

  const isProjectLead = projectLeadId === currentUserId;
  const projectFilesList = files.filter((f) => f.projectId === projectId);
  const isProjectSubmitted = projectFilesList.some((f) => f.isSubmitted);

  useEffect(() => {
    if (!actionMode) return;
    if (actionMode === 'file-edit' && projectFilesList.length > 0) {
      setEditFileId(projectFilesList[0].id);
      setEditDescription(projectFilesList[0].description || '');
    }
  }, [actionMode, projectFilesList]);

  const fileStats = useMemo(() => {
    const totalFiles = projectFilesList.length;
    const latestVersion = projectFilesList.length > 0 
      ? Math.max(...projectFilesList.map((f) => f.version)) 
      : 0;
    return { totalFiles, latestVersion };
  }, [projectFilesList]);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadedFile({
        name: file.name,
        size: file.size,
        type: file.type
      });
    }
  };

  const handleUploadFile = (e) => {
    e.preventDefault();
    if (!uploadedFile || !fileVersion.trim()) {
      alert('Please select a file and enter a description');
      return;
    }

    const newFile = {
      id: `FILE-${Date.now()}`,
      projectId,
      fileName: uploadedFile.name,
      fileSize: uploadedFile.size,
      fileType: getFileType(uploadedFile.name),
      mimeType: uploadedFile.type,
      uploadedBy: currentUserId,
      uploadedByName: 'You',
      uploadedDate: new Date().toISOString().split('T')[0],
      version: fileStats.latestVersion + 1,
      description: fileVersion,
      downloadCount: 0,
      isSubmitted: false
    };

    const updatedFiles = [...files, newFile];
    setFiles(updatedFiles);
    onFilesUpdate?.(updatedFiles);
    setUploadedFile(null);
    setFileVersion('');
    setShowUploadForm(false);
  };

  const handleFinalSubmission = () => {
    if (projectFilesList.length === 0) {
      alert('Please upload at least one file before submission');
      return;
    }

    const confirmSubmit = window.confirm(
      'Are you sure? Final submission cannot be undone. All files will be locked.'
    );

    if (confirmSubmit) {
      const updatedFiles = files.map((f) =>
        f.projectId === projectId && !f.isSubmitted
          ? { ...f, isSubmitted: true, submittedDate: new Date().toISOString().split('T')[0] }
          : f
      );
      setFiles(updatedFiles);
      onFilesUpdate?.(updatedFiles);
    }
  };

  const handleDownloadFile = (file) => {
    const updatedFiles = files.map((f) =>
      f.id === file.id ? { ...f, downloadCount: f.downloadCount + 1 } : f
    );
    setFiles(updatedFiles);
    onFilesUpdate?.(updatedFiles);
    alert(`Downloaded: ${file.fileName}`);
  };

  const handleStartEditFile = (file) => {
    setEditFileId(file.id);
    setEditDescription(file.description || '');
  };

  const handleSaveEditFile = () => {
    if (!editFileId) return;
    if (!editDescription.trim()) {
      alert('Please enter file description/version notes.');
      return;
    }

    const updatedFiles = files.map((file) => (
      file.id === editFileId
        ? {
            ...file,
            description: editDescription.trim(),
            updatedDate: new Date().toISOString().split('T')[0]
          }
        : file
    ));

    setFiles(updatedFiles);
    onFilesUpdate?.(updatedFiles);
    setEditFileId(null);
    setEditDescription('');
  };

  const handleRemoveFile = (fileId) => {
    const targetFile = files.find((file) => file.id === fileId);
    if (!targetFile) return;

    const confirmed = window.confirm(`Remove file "${targetFile.fileName}"?`);
    if (!confirmed) return;

    const updatedFiles = files.filter((file) => file.id !== fileId);
    setFiles(updatedFiles);
    onFilesUpdate?.(updatedFiles);
    if (editFileId === fileId) {
      setEditFileId(null);
      setEditDescription('');
    }
  };

  const getFileType = (fileName) => {
    const ext = fileName.split('.').pop().toLowerCase();
    if (['doc', 'docx', 'pdf', 'txt'].includes(ext)) return 'document';
    if (['ppt', 'pptx'].includes(ext)) return 'presentation';
    if (['xls', 'xlsx', 'csv'].includes(ext)) return 'spreadsheet';
    if (['js', 'py', 'java', 'cpp', 'c', 'html', 'css'].includes(ext)) return 'code';
    if (['zip', 'rar', '7z'].includes(ext)) return 'archive';
    return 'other';
  };

  const getFileIcon = (fileType) => {
    const icons = {
      document: '📄',
      presentation: '🎯',
      spreadsheet: '📊',
      code: '💻',
      archive: '📦',
      other: '📎'
    };
    return icons[fileType] || '📎';
  };

  if (!isProjectLead) {
    return (
      <div className="file-management-restricted">
        <p>✓ File management is available only to the project lead.</p>
        {projectFilesList.length > 0 && (
          <div className="submission-files-view">
            <h4>Project Files</h4>
            <div className="files-list-view">
              {projectFilesList.map((file) => (
                <div key={file.id} className="file-view-item">
                  <div className="file-view-head">
                    <span className="file-icon">{getFileIcon(file.fileType)}</span>
                    <div className="file-view-info">
                      <strong>{file.fileName}</strong>
                      <p className="file-meta">v{file.version} • {file.uploadedDate} • {(file.fileSize / 1024).toFixed(2)} KB</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="download-btn"
                    onClick={() => handleDownloadFile(file)}
                  >
                    ↓ Download
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="file-management">
      <div className="file-header">
        <h3>File Management</h3>
        {!isProjectSubmitted && (
          <button type="button" className="primary-dark-btn" onClick={() => setShowUploadForm(true)}>
            + Upload File
          </button>
        )}
      </div>

        {actionMode ? (
          <p className="workspace-notice">
            {actionMode === 'file-view-all' && 'Browse and download all uploaded project files.'}
            {actionMode === 'file-edit' && 'Edit file description/version notes for uploaded files.'}
            {actionMode === 'file-remove' && 'Remove unwanted files from this project.'}
            {actionMode === 'submit-final' && 'Finalize and lock submission when everything is ready.'}
          </p>
        ) : null}

        {isProjectLead && !isProjectSubmitted && actionMode === 'submit-final' ? (
          <section className="final-submission" style={{ marginBottom: '16px' }}>
            <div className="submission-info">
              <h4>Submission Actions</h4>
              <p>Use quick actions to complete your submission flow.</p>
            </div>
            <div className="button-group">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setShowUploadForm(true)}
              >
                Upload / Update Files
              </button>
              <button
                type="button"
                className="submit-btn"
                onClick={handleFinalSubmission}
              >
                Submit Final Project
              </button>
            </div>
          </section>
        ) : null}

      <section className="file-stats">
        <article className="file-stat-card">
          <h5>Total Files</h5>
          <strong>{fileStats.totalFiles}</strong>
        </article>
        <article className="file-stat-card">
          <h5>Latest Version</h5>
          <strong>v{fileStats.latestVersion}</strong>
        </article>
        <article className="file-stat-card">
          <h5>Submission Status</h5>
          <strong className={isProjectSubmitted ? 'submitted' : 'pending'}>
            {isProjectSubmitted ? '✓ Submitted' : '⏳ Pending'}
          </strong>
        </article>
      </section>

      <section className="file-list">
        <h4>Files</h4>
        {projectFilesList.length === 0 ? (
          <p className="no-files">No files uploaded yet. Upload your first file to get started.</p>
        ) : (
          <div className="files-container">
            {projectFilesList.map((file) => (
              <div key={file.id} className={`file-item ${file.isSubmitted ? 'submitted' : ''}`}>
                <div className="file-item-head">
                  <div className="file-item-name">
                    <span className="file-icon">{getFileIcon(file.fileType)}</span>
                    <div>
                      <h5>{file.fileName}</h5>
                      <p className="file-description">{file.description}</p>
                    </div>
                  </div>
                  {file.isSubmitted && <span className="submission-badge">Submitted</span>}
                </div>

                <div className="file-item-meta">
                  <div className="meta-row">
                    <label>Version:</label>
                    <span>v{file.version}</span>
                  </div>

                  <div className="meta-row">
                    <label>Type:</label>
                    <span className="file-type-badge">{file.fileType}</span>
                  </div>

                  <div className="meta-row">
                    <label>Size:</label>
                    <span>{(file.fileSize / 1024).toFixed(2)} KB</span>
                  </div>

                  <div className="meta-row">
                    <label>Uploaded:</label>
                    <span>{file.uploadedDate}</span>
                  </div>

                  {file.isSubmitted && (
                    <div className="meta-row">
                      <label>Submitted:</label>
                      <span>{file.submittedDate}</span>
                    </div>
                  )}

                  <div className="meta-row">
                    <label>Downloads:</label>
                    <span>{file.downloadCount}</span>
                  </div>
                </div>

                {!file.isSubmitted && (
                  <div className="file-actions">
                    <button
                      type="button"
                      className="secondary-btn"
                      onClick={() => handleDownloadFile(file)}
                    >
                      ↓ Download
                    </button>
                    {isProjectLead ? (
                      <button
                        type="button"
                        className="secondary-btn"
                        onClick={() => handleStartEditFile(file)}
                      >
                        Edit
                      </button>
                    ) : null}
                    {isProjectLead ? (
                      <button
                        type="button"
                        className="btn-danger"
                        onClick={() => handleRemoveFile(file.id)}
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {isProjectLead && editFileId ? (
        <section className="final-submission" style={{ marginTop: '12px' }}>
          <div className="submission-info">
            <h4>Edit File Details</h4>
            <p>Update description/version notes for the selected file.</p>
          </div>
          <textarea
            className="form-textarea"
            rows="3"
            value={editDescription}
            onChange={(event) => setEditDescription(event.target.value)}
            placeholder="Update file notes"
          />
          <div className="button-group" style={{ marginTop: '10px' }}>
            <button type="button" className="btn-primary" onClick={handleSaveEditFile}>Save File Edit</button>
            <button
              type="button"
              className="outline-btn"
              onClick={() => {
                setEditFileId(null);
                setEditDescription('');
              }}
            >
              Cancel Edit
            </button>
          </div>
        </section>
      ) : null}

      {!isProjectSubmitted && projectFilesList.length > 0 && (
        <section className="final-submission">
          <div className="submission-info">
            <h4>Project Submission</h4>
            <p>Once submitted, no further changes can be made. Ensure all files are correct before submitting.</p>
          </div>
          <button
            type="button"
            className="submit-btn"
            onClick={handleFinalSubmission}
          >
            🔒 Submit Final Project
          </button>
        </section>
      )}

      {isProjectSubmitted && (
        <section className="submission-complete">
          <div className="success-badge">
            <span className="success-icon">✓</span>
            <div>
              <h4>Project Submitted Successfully</h4>
              <p>Your project files have been locked and submitted. No further changes allowed.</p>
            </div>
          </div>
        </section>
      )}

      {showUploadForm && !isProjectSubmitted ? (
        <div className="modal-overlay">
          <form className="modal-card" onSubmit={handleUploadFile}>
            <div className="modal-head">
              <div>
                <h3>Upload Project File</h3>
                <p>Add files to your project</p>
              </div>
              <button type="button" className="icon-btn" onClick={() => setShowUploadForm(false)}>✕</button>
            </div>

            <label htmlFor="fileInput">Select File *</label>
            <label htmlFor="fileInput" className="file-input-wrapper">
              <input
                id="fileInput"
                type="file"
                onChange={handleFileSelect}
                accept=".doc,.docx,.pdf,.txt,.ppt,.pptx,.xls,.xlsx,.zip,.rar,.js,.py,.java,.cpp,.c,.html,.css"
                required
              />
              <span className="file-name">
                {uploadedFile ? uploadedFile.name : 'Choose a file...'}
              </span>
            </label>
            <small>Supported: Documents, Presentations, Spreadsheets, Code, Archives</small>

            <label htmlFor="fileDesc">Description/Version Notes *</label>
            <textarea
              id="fileDesc"
              value={fileVersion}
              onChange={(e) => setFileVersion(e.target.value)}
              placeholder="e.g., Initial submission, Final report, Source code v2"
              rows="3"
              required
            />

            <div className="modal-actions">
              <button type="button" className="outline-btn" onClick={() => setShowUploadForm(false)}>Cancel</button>
              <button type="submit" className="primary-dark-btn">Upload File</button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

export default FileManagement;
