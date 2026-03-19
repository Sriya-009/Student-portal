import Navbar from '../components/shared/Navbar';
import Card from '../components/shared/Card';
import '../styles/dashboard.css';

function AssignTasks() {
  return (
    <div>
      <Navbar />
      <main className="single-page-content">
        <div className="dashboard-section">
          <Card title="Assign Tasks">
            <p>Create and assign coursework with clear due dates and instructions.</p>
          </Card>

          <section className="summary-grid" aria-label="Assignment Overview">
            <article className="summary-card">
              <p className="summary-label">Draft Assignments</p>
              <p className="summary-value">0</p>
            </article>
            <article className="summary-card">
              <p className="summary-label">Published Today</p>
              <p className="summary-value">0</p>
            </article>
            <article className="summary-card">
              <p className="summary-label">Upcoming Deadlines</p>
              <p className="summary-value">0</p>
            </article>
          </section>

          <section className="panel-grid" aria-label="Assignment Workflow">
            <article className="panel">
              <h4>Preparation Checklist</h4>
              <ul>
                <li>Define objectives and submission criteria.</li>
                <li>Set realistic deadlines and publishing dates.</li>
                <li>Attach guidance notes for student clarity.</li>
              </ul>
            </article>
            <article className="panel">
              <h4>Quality Controls</h4>
              <ul>
                <li>Validate instructions before publishing.</li>
                <li>Confirm role-based visibility and access.</li>
                <li>Monitor overdue items for escalation.</li>
              </ul>
            </article>
          </section>
        </div>
      </main>
    </div>
  );
}

export default AssignTasks;
