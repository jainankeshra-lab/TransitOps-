import { useState } from 'react';

const API_URL = 'http://localhost:5000/api';

function Auth({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Fleet Manager');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [locked, setLocked] = useState(false);
  const [lockUntil, setLockUntil] = useState(null);

  // Forgot Password State
  const [showForgotPanel, setShowForgotPanel] = useState(false);
  const [fpEmail, setFpEmail] = useState('');
  const [fpLoading, setFpLoading] = useState(false);
  const [fpStep, setFpStep] = useState('request'); // 'request' | 'reset'
  const [fpToken, setFpToken] = useState('');
  const [fpNewPassword, setFpNewPassword] = useState('');
  const [fpConfirmPassword, setFpConfirmPassword] = useState('');
  const [fpMessage, setFpMessage] = useState('');
  const [fpError, setFpError] = useState('');

  // Quick select helper to autofill credentials for reviewers
  const selectDemoLogin = (selectedRole) => {
    setRole(selectedRole);
    if (selectedRole === 'Fleet Manager') {
      setEmail('manager@transitops.com');
      setPassword('password123');
    } else if (selectedRole === 'Driver') {
      setEmail('driver@transitops.com');
      setPassword('password123');
    } else if (selectedRole === 'Safety Officer') {
      setEmail('safety@transitops.com');
      setPassword('password123');
    } else if (selectedRole === 'Financial Analyst') {
      setEmail('analyst@transitops.com');
      setPassword('password123');
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
    setLocked(false);

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, rememberMe })
      });

      const data = await response.json();

      if (response.status === 423) {
        // Account locked
        setLocked(true);
        setLockUntil(data.lockUntil ? new Date(data.lockUntil) : null);
        setError(data.error);
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed.');
      }

      // Check if selected dropdown role matches database user profile role
      if (data.role !== role) {
        throw new Error(`The credentials entered are for a ${data.role}, but you selected ${role}.`);
      }

      onLoginSuccess(data);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- Forgot Password Handlers ---
  const handleForgotRequest = async (e) => {
    e.preventDefault();
    if (!fpEmail) { setFpError('Please enter your email address.'); return; }
    setFpLoading(true);
    setFpError('');
    setFpMessage('');
    try {
      const res = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: fpEmail })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      // If the server returns a token directly (dev mode), auto-fill it
      if (data.resetToken) {
        setFpToken(data.resetToken);
        setFpStep('reset');
        setFpMessage(`Reset token generated. (In production this would be emailed to ${fpEmail})`);
      } else {
        setFpMessage(data.message);
      }
    } catch (err) {
      setFpError(err.message);
    } finally {
      setFpLoading(false);
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    if (!fpToken || !fpNewPassword || !fpConfirmPassword) {
      setFpError('Please fill in all fields.');
      return;
    }
    if (fpNewPassword !== fpConfirmPassword) {
      setFpError('Passwords do not match.');
      return;
    }
    if (fpNewPassword.length < 6) {
      setFpError('Password must be at least 6 characters.');
      return;
    }
    setFpLoading(true);
    setFpError('');
    try {
      const res = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: fpEmail, token: fpToken, newPassword: fpNewPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setFpMessage(data.message + ' Redirecting to login...');
      setTimeout(() => {
        setShowForgotPanel(false);
        setFpStep('request');
        setFpToken('');
        setFpEmail('');
        setFpNewPassword('');
        setFpConfirmPassword('');
        setFpMessage('');
      }, 2500);
    } catch (err) {
      setFpError(err.message);
    } finally {
      setFpLoading(false);
    }
  };

  const closeForgotPanel = () => {
    setShowForgotPanel(false);
    setFpStep('request');
    setFpEmail('');
    setFpToken('');
    setFpNewPassword('');
    setFpConfirmPassword('');
    setFpMessage('');
    setFpError('');
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
          
          <div className="auth-roles-list">
            <h4>Key Roles for Demo:</h4>
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
          {!showForgotPanel ? (
            <>
              <h3>Sign in to your account</h3>
              <p className="auth-subtitle">Select profile role and enter credentials to continue</p>

              {locked && lockUntil && (
                <div className="auth-locked-alert">
                  🔒 Account temporarily locked
                  <span>Unlock at: {lockUntil.toLocaleTimeString()}</span>
                </div>
              )}

              {error && !locked && <div className="auth-error-alert">{error}</div>}
              {error && locked && <div className="auth-error-alert">{error}</div>}

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
                    disabled={locked}
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
                    disabled={locked}
                  />
                </div>

                {/* Remember Me + Forgot Password row */}
                <div className="auth-options-row">
                  <label className="remember-me-label">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    <span>Remember me for 30 days</span>
                  </label>
                  <button
                    type="button"
                    className="forgot-password-link"
                    onClick={() => { setShowForgotPanel(true); setFpEmail(email); }}
                  >
                    Forgot password?
                  </button>
                </div>

                <button type="submit" className="auth-submit-btn" disabled={loading || locked}>
                  {loading ? 'Authenticating...' : locked ? '🔒 Account Locked' : 'Sign In'}
                </button>
              </form>
            </>
          ) : (
            /* Forgot Password Panel */
            <>
              <div className="fp-header">
                <button className="fp-back-btn" onClick={closeForgotPanel}>← Back to Login</button>
                <h3>{fpStep === 'request' ? 'Reset Your Password' : 'Set New Password'}</h3>
                <p className="auth-subtitle">
                  {fpStep === 'request'
                    ? 'Enter your email to receive a reset token'
                    : 'Enter the reset token and your new password'}
                </p>
              </div>

              {fpError && <div className="auth-error-alert">{fpError}</div>}
              {fpMessage && <div className="auth-success-alert">{fpMessage}</div>}

              {fpStep === 'request' ? (
                <form onSubmit={handleForgotRequest} className="auth-form">
                  <div className="form-group">
                    <label>Email Address</label>
                    <input
                      type="email"
                      required
                      value={fpEmail}
                      onChange={(e) => setFpEmail(e.target.value)}
                      placeholder="email@transitops.com"
                    />
                  </div>
                  <button type="submit" className="auth-submit-btn" disabled={fpLoading}>
                    {fpLoading ? 'Sending...' : 'Generate Reset Token'}
                  </button>
                  {fpToken && (
                    <button
                      type="button"
                      className="secondary-btn w-full"
                      style={{ marginTop: '0.75rem' }}
                      onClick={() => setFpStep('reset')}
                    >
                      I have a token → Enter New Password
                    </button>
                  )}
                </form>
              ) : (
                <form onSubmit={handlePasswordReset} className="auth-form">
                  <div className="form-group">
                    <label>Email Address</label>
                    <input
                      type="email"
                      required
                      value={fpEmail}
                      onChange={(e) => setFpEmail(e.target.value)}
                      placeholder="email@transitops.com"
                    />
                  </div>
                  <div className="form-group">
                    <label>Reset Token</label>
                    <input
                      type="text"
                      required
                      value={fpToken}
                      onChange={(e) => setFpToken(e.target.value)}
                      placeholder="Paste reset token here"
                      style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}
                    />
                  </div>
                  <div className="form-group">
                    <label>New Password</label>
                    <input
                      type="password"
                      required
                      value={fpNewPassword}
                      onChange={(e) => setFpNewPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                    />
                  </div>
                  <div className="form-group">
                    <label>Confirm New Password</label>
                    <input
                      type="password"
                      required
                      value={fpConfirmPassword}
                      onChange={(e) => setFpConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                    />
                  </div>
                  <button type="submit" className="auth-submit-btn" disabled={fpLoading}>
                    {fpLoading ? 'Resetting...' : 'Reset Password'}
                  </button>
                  <button
                    type="button"
                    className="forgot-password-link"
                    style={{ marginTop: '0.75rem', display: 'block', textAlign: 'center' }}
                    onClick={() => setFpStep('request')}
                  >
                    ← Request a new token
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Auth;
