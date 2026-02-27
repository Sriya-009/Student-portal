import Navbar from '../components/Navbar';
import Card from '../components/Card';
import '../styles/dashboard.css';

function Progress() {
  return (
    <div>
      <Navbar />
      <main className="single-page-content">
        <div className="dashboard-section">
          <Card title="Progress">
            <p>Track completion status, submission activity, and instructor feedback.</p>
          </Card>

          <section className="summary-grid" aria-label="Progress Overview">
            <article className="summary-card">
              <p className="summary-label">Completion Rate</p>
              <p className="summary-value">0%</p>
            </article>
            <article className="summary-card">
              <p className="summary-label">On-Time Submissions</p>
              <p className="summary-value">0</p>
            </article>
            <article className="summary-card">
              <p className="summary-label">Feedback Pending</p>
              <p className="summary-value">0</p>
            </article>
          </section>

          <section className="panel-grid" aria-label="Reporting Insights">
            <article className="panel">
              <h4>Performance Insights</h4>
              <ul>
                <li>Review completion trends by class and term.</li>
                <li>Identify overdue work and escalation needs.</li>
                <li>Track consistency of grading turnaround time.</li>
              </ul>
            </article>
            <article className="panel">
              <h4>Recommended Actions</h4>
              <ul>
                <li>Prioritize unresolved submissions for review.</li>
                <li>Communicate next steps to relevant users.</li>
                <li>Update progress records after each cycle.</li>
              </ul>
            </article>
          </section>
        </div>
      </main>
    </div>
  );
}

export default Progress;
