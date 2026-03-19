import { useState } from 'react';

function FileReviewPanel({ files, projects }) {
  const [filesState, setFilesState] = useState(files);

  const submittedFiles = filesState.filter((f) => f.isSubmitted);
  const pendingFiles = filesState.filter((f) => !f.isSubmitted);

  const handleDownload = (file) => {
    alert(`Downloading ${file.fileName}`);
  };

  const handleVerify = (fileId) => {
    const updated = filesState.map((file) =>
      file.id === fileId ? { ...file, isSubmitted: true } : file
    );
    setFilesState(updated);
    alert('File verified successfully.');
  };

  const handleReminder = (file) => {
    alert(`Reminder sent for ${file.fileName} (${file.projectId}).`);
  };

  return (
    <section className="faculty-panel">
      <div className="panel-grid">
        <div className="stat-card">
          <h3>Total Files</h3>
          <p className="stat-value">{filesState.length}</p>
        </div>
        <div className="stat-card">
          <h3>Submitted</h3>
          <p className="stat-value">{submittedFiles.length}</p>
        </div>
        <div className="stat-card">
          <h3>Pending</h3>
          <p className="stat-value">{pendingFiles.length}</p>
        </div>
      </div>

      <div className="panel-content">
        <h3>File Submission Status</h3>

        <div className="file-review-section">
          <h4>Submitted Files</h4>
          <div className="files-grid">
            {submittedFiles.length === 0 ? (
              <p className="empty-state">No submitted files yet.</p>
            ) : (
              submittedFiles.map((file) => (
                <div key={file.id} className="file-card">
                  <div className="file-icon">FILE</div>
                  <h5>{file.fileName}</h5>
                  <p className="file-info">Project: <strong>{file.projectId}</strong></p>
                  <p className="file-info">Uploaded: <strong>{file.uploadedDate}</strong></p>
                  <p className="file-info">Version: <strong>v{file.version}</strong></p>
                  <p className="file-desc">{file.description}</p>
                  <div className="file-actions">
                    <button className="btn-secondary" onClick={() => handleDownload(file)}>Download</button>
                    <button className="btn-primary" onClick={() => handleVerify(file.id)}>Verify</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="file-review-section">
          <h4>Pending Submissions</h4>
          <div className="files-grid">
            {pendingFiles.length === 0 ? (
              <p className="empty-state">All files have been submitted!</p>
            ) : (
              pendingFiles.map((file) => (
                <div key={file.id} className="file-card pending">
                  <div className="file-icon">PENDING</div>
                  <h5>{file.fileName}</h5>
                  <p className="file-info">Project: <strong>{file.projectId}</strong></p>
                  <p className="file-info">Expected: <strong>{file.uploadedDate}</strong></p>
                  <p className="status-badge">Awaiting Submission</p>
                  <button className="btn-secondary" onClick={() => handleReminder(file)}>Send Reminder</button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default FileReviewPanel;
