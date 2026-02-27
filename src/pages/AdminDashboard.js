import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import Card from '../components/Card';
import '../styles/dashboard.css';

const links = [
  { to: '/admin', label: 'Overview' },
  { to: '/assign-tasks', label: 'Assign Tasks' },
  { to: '/upload-files', label: 'Upload Files' },
  { to: '/progress', label: 'Progress' }
];

function AdminDashboard() {
  return (
    <div>
      <Navbar />
      <div className="dashboard-layout">
        <Sidebar links={links} />
        <main className="dashboard-content">
          <div className="dashboard-section">
            <Card title="Admin Dashboard">
              <p>Manage users, deadlines, and academic operations from a centralized dashboard.</p>
            </Card>

            <section className="summary-grid" aria-label="Administrative Overview">
              <article className="summary-card">
                <p className="summary-label">Active Users</p>
                <p className="summary-value">0</p>
              </article>
              <article className="summary-card">
                <p className="summary-label">Open Deadlines</p>
                <p className="summary-value">0</p>
              </article>
              <article className="summary-card">
                <p className="summary-label">Pending Reviews</p>
                <p className="summary-value">0</p>
              </article>
            </section>

            <section className="panel-grid" aria-label="Administrative Actions">
              <article className="panel">
                <h4>Operational Priorities</h4>
                <ul>
                  <li>Review assignment schedules and publishing windows.</li>
                  <li>Confirm user access levels and role permissions.</li>
                  <li>Monitor platform activity and completion trends.</li>
                </ul>
              </article>
              <article className="panel">
                <h4>System Status</h4>
                <ul>
                  <li>No critical notifications at this time.</li>
                  <li>All modules are available and responsive.</li>
                  <li>Next maintenance window: Not scheduled.</li>
                </ul>
              </article>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

export default AdminDashboard;
