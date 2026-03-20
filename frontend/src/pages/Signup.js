import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/auth.css';

function Signup() {
  const [identifier, setIdentifier] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [error, setError] = useState('');
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    const normalizedIdentifier = identifier.trim();
    if (!normalizedIdentifier) {
      setError('Identifier is required.');
      return;
    }

    if (role === 'student' && !/^[1-9]\d{9}$/.test(normalizedIdentifier)) {
      setError('Student ID must be exactly 10 digits and cannot start with 0.');
      return;
    }

    if (role === 'faculty' && !/^\d{4}$/.test(normalizedIdentifier)) {
      setError('Faculty ID must be exactly 4 digits.');
      return;
    }

    try {
      await signup(normalizedIdentifier, name, email, password, role);
      if (role === 'admin') navigate('/admin');
      else if (role === 'faculty') navigate('/faculty');
      else navigate('/student');
    } catch (signupError) {
      setError(signupError.message);
    }
  };

  return (
    <main className="auth-page">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h1>Signup</h1>
        <input
          type="text"
          placeholder={role === 'student' ? 'Student ID (10 digits)' : role === 'faculty' ? 'Faculty ID (4 digits)' : 'Admin ID'}
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Full Name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        <select value={role} onChange={(event) => setRole(event.target.value)}>
          <option value="student">Student</option>
          <option value="faculty">Faculty</option>
          <option value="admin">Admin</option>
        </select>
        {error ? <p className="error">{error}</p> : null}
        <button type="submit" className="btn">Create Account</button>
        <p>
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </form>
    </main>
  );
}

export default Signup;
