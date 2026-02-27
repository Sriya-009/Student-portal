import Navbar from '../components/Navbar';
import Card from '../components/Card';
import '../styles/dashboard.css';

function UploadFiles() {
  return (
    <div>
      <Navbar />
      <main className="single-page-content">
        <div className="dashboard-section">
          <Card title="Upload Files">
            <p>Upload assignment files and supporting documents in one secure location.</p>
          </Card>

          <section className="summary-grid" aria-label="File Overview">
            <article className="summary-card">
              <p className="summary-label">Files Uploaded</p>
              <p className="summary-value">0</p>
            </article>
            <article className="summary-card">
              <p className="summary-label">Pending Review</p>
              <p className="summary-value">0</p>
            </article>
            <article className="summary-card">
              <p className="summary-label">Storage Used</p>
              <p className="summary-value">0%</p>
            </article>
          </section>

          <section className="panel-grid" aria-label="File Governance">
            <article className="panel">
              <h4>Upload Standards</h4>
              <ul>
                <li>Use clear file names and version labels.</li>
                <li>Include required attachments before submission.</li>
                <li>Confirm document format compatibility.</li>
              </ul>
            </article>
            <article className="panel">
              <h4>Compliance Notes</h4>
              <ul>
                <li>Store files in approved academic folders.</li>
                <li>Limit access by role and course assignment.</li>
                <li>Archive outdated files after review cycles.</li>
              </ul>
            </article>
          </section>
        </div>
      </main>
    </div>
  );
}

export default UploadFiles;
