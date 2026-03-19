import { useMemo, useState } from 'react';

function StudentSearchPanel({ students, activeAction }) {
  const [searchMode, setSearchMode] = useState('id');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');

  const actionMode = useMemo(() => {
    if (activeAction === 'student-id-search') return 'id';
    if (activeAction === 'student-dept-search') return 'department';
    if (activeAction === 'student-search-all') return 'all';
    return null;
  }, [activeAction]);

  const departments = useMemo(() => {
    return Array.from(new Set((students || []).map((s) => s.department).filter(Boolean))).sort();
  }, [students]);

  const filteredStudents = useMemo(() => {
    if (!students || students.length === 0) return [];

    if (actionMode === 'all') {
      return students;
    }

    const effectiveMode = actionMode || searchMode;

    if (effectiveMode === 'department') {
      if (!selectedDepartment) return students;
      return students.filter((student) => student.department === selectedDepartment);
    }

    const normalized = searchQuery.trim().toLowerCase();
    if (!normalized) return students;

    return students.filter((student) => {
      return (
        student.rollNumber.toLowerCase().includes(normalized) ||
        student.id.toLowerCase().includes(normalized) ||
        student.name.toLowerCase().includes(normalized)
      );
    });
  }, [students, searchMode, searchQuery, selectedDepartment, actionMode]);

  const resetFilters = () => {
    setSearchMode('id');
    setSearchQuery('');
    setSelectedDepartment('');
  };

  return (
    <section className="faculty-panel student-search-panel">
      <div className="panel-grid">
        <div className="stat-card">
          <h3>Total Students</h3>
          <p className="stat-value">{students.length}</p>
        </div>
        <div className="stat-card">
          <h3>Search Results</h3>
          <p className="stat-value">{filteredStudents.length}</p>
        </div>
        <div className="stat-card">
          <h3>Departments</h3>
          <p className="stat-value">{departments.length}</p>
        </div>
      </div>

      <div className="panel-content">
        <h3>Search Students</h3>

        <div className="student-search-controls">
          <div className="search-mode-group">
            <button
              type="button"
              className={`btn-secondary ${(actionMode || searchMode) === 'id' ? 'active' : ''}`}
              onClick={() => setSearchMode('id')}
            >
              Search by ID Number
            </button>
            <button
              type="button"
              className={`btn-secondary ${(actionMode || searchMode) === 'department' ? 'active' : ''}`}
              onClick={() => setSearchMode('department')}
            >
              Search by Department
            </button>
            <button
              type="button"
              className={`btn-secondary ${actionMode === 'all' ? 'active' : ''}`}
              onClick={() => {
                setSearchMode('id');
                setSearchQuery('');
                setSelectedDepartment('');
              }}
            >
              View All Students
            </button>
          </div>

          {(actionMode || searchMode) === 'id' ? (
            <input
              type="text"
              className="form-input"
              placeholder="Enter student ID number or name"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          ) : (
            <select
              className="form-select"
              value={selectedDepartment}
              onChange={(event) => setSelectedDepartment(event.target.value)}
            >
              <option value="">All Departments</option>
              {departments.map((department) => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
            </select>
          )}

          <button type="button" className="btn-secondary" onClick={resetFilters}>
            Reset
          </button>
        </div>

        <div className="student-results-table">
          {filteredStudents.length === 0 ? (
            <p className="empty-state">No students found for the selected search criteria.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>ID Number</th>
                  <th>Name</th>
                  <th>Department</th>
                  <th>Grade</th>
                  <th>Email</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => (
                  <tr key={student.id}>
                    <td>{student.rollNumber}</td>
                    <td>{student.name}</td>
                    <td>{student.department || 'Not Assigned'}</td>
                    <td>{student.grade}</td>
                    <td>{student.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </section>
  );
}

export default StudentSearchPanel;
