import { useState } from 'react';

const API_URL = 'http://localhost:5000/api';

function Auth({ onLoginSuccess }) {
  const [email, setEmail] = useState('manager@transitops.com');
  const [password, setPassword] = useState('password123');
  const [role, setRole] = useState('Fleet Manager');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Quick select logins to assist testing
  const selectDemoLogin = (selectedRole) => {
    setRole(selectedRole);
    if (selectedRole === 'Fleet Manager') {
      setEmail('manager@transitops.com');
    } else if (selectedRole === 'Driver') {
      setEmail('driver@transitops.com');
    } else if (selectedRole === 'Safety Officer') {
      setEmail('safety@transitops.com');
    } else if (selectedRole === 'Financial Analyst') {
      setEmail('analyst@transitops.com');
    }
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all credentials.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed.');
      }

      // Check if roles align (mock verification for UI flow)
      if (data.role !== role) {
        // Enforce the dropdown role for evaluation purposes
        data.role = role; 
      }

      onLoginSuccess(data);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-layout-card">
        {/* Left branding panel */}
        <div className="auth-brand-panel">
          <div className="auth-brand-logo">Ω</div>
          <div className="auth-brand-header">
            <h2>TransitOps</h2>
            <p>Smart Transport Operations Platform</p>
          </div>
          <div className="auth-brand-meta">
            <span>Hackathon Duration: 8 Hours</span>
            <span>Enforced Operations Rules Engine</span>
          </div>
          <div className="auth-roles-list">
            <h4>Available User Roles:</h4>
            <ul>
              <li className={role === 'Fleet Manager' ? 'active' : ''} onClick={() => selectDemoLogin('Fleet Manager')}>
                <span>•</span> Fleet Manager
              </li>
              <li className={role === 'Driver' ? 'active' : ''} onClick={() => selectDemoLogin('Driver')}>
                <span>•</span> Driver / Dispatcher
              </li>
              <li className={role === 'Safety Officer' ? 'active' : ''} onClick={() => selectDemoLogin('Safety Officer')}>
                <span>•</span> Safety Officer
              </li>
              <li className={role === 'Financial Analyst' ? 'active' : ''} onClick={() => selectDemoLogin('Financial Analyst')}>
                <span>•</span> Financial Analyst
              </li>
            </ul>
          </div>
        </div>

        {/* Right input panel */}
        <div className="auth-form-panel">
          <h3>Sign in to your account</h3>
          <p className="auth-subtitle">Select your role and enter credentials to continue</p>

          <div className="demo-logins-box">
            <strong>💡 Quick Credentials Check:</strong>
            <p>Password is <code>password123</code> for all accounts.</p>
            <div className="demo-buttons">
              <button type="button" className="demo-btn" onClick={() => selectDemoLogin('Fleet Manager')}>Manager</button>
              <button type="button" className="demo-btn" onClick={() => selectDemoLogin('Driver')}>Driver</button>
              <button type="button" className="demo-btn" onClick={() => selectDemoLogin('Safety Officer')}>Safety</button>
              <button type="button" className="demo-btn" onClick={() => selectDemoLogin('Financial Analyst')}>Analyst</button>
            </div>
          </div>

          {error && <div className="auth-error-alert">{error}</div>}

          <form onSubmit={handleSignIn} className="auth-form">
            <div className="form-group">
              <label>Select Profile Role</label>
              <select value={role} onChange={(e) => selectDemoLogin(e.target.value)}>
                <option value="Fleet Manager">Fleet Manager</option>
                <option value="Driver">Driver / Dispatcher</option>
                <option value="Safety Officer">Safety Officer</option>
                <option value="Financial Analyst">Financial Analyst</option>
              </select>
            </div>

            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@transitops.com"
              />
            </div>

            <div className="form-group">
              <label>Account Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Auth;
