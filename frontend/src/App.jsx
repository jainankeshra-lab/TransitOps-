import { useState } from 'react';
import Auth from './components/Auth.jsx';
import Dashboard from './components/Dashboard.jsx';
import Vehicles from './components/Vehicles.jsx';
import Drivers from './components/Drivers.jsx';
import Trips from './components/Trips.jsx';
import Maintenance from './components/Maintenance.jsx';
import Expenses from './components/Expenses.jsx';
import Reports from './components/Reports.jsx';
import RBACSettings from './components/RBACSettings.jsx';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState('Dashboard');

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setCurrentView('Dashboard');
  };

  const handleSignOut = () => {
    setUser(null);
  };

  // Instant Switch Role to allow fast testing of RBAC policies
  const handleSwitchRole = (newRole) => {
    if (user) {
      setUser((prev) => ({
        ...prev,
        role: newRole
      }));
    }
  };

  if (!user) {
    return <Auth onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="app-layout">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-logo">Ω</span>
          <div>
            <h3>TransitOps</h3>
            <p>Smart Operations</p>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button 
            className={`nav-item ${currentView === 'Dashboard' ? 'active' : ''}`}
            onClick={() => setCurrentView('Dashboard')}
          >
            📊 Dashboard
          </button>
          <button 
            className={`nav-item ${currentView === 'Vehicles' ? 'active' : ''}`}
            onClick={() => setCurrentView('Vehicles')}
          >
            🚚 Vehicle Registry
          </button>
          <button 
            className={`nav-item ${currentView === 'Drivers' ? 'active' : ''}`}
            onClick={() => setCurrentView('Drivers')}
          >
            👨‍✈️ Drivers & Safety
          </button>
          <button 
            className={`nav-item ${currentView === 'Trips' ? 'active' : ''}`}
            onClick={() => setCurrentView('Trips')}
          >
            🚦 Trip Dispatcher
          </button>
          <button 
            className={`nav-item ${currentView === 'Maintenance' ? 'active' : ''}`}
            onClick={() => setCurrentView('Maintenance')}
          >
            🔧 Maintenance Shop
          </button>
          <button 
            className={`nav-item ${currentView === 'Expenses' ? 'active' : ''}`}
            onClick={() => setCurrentView('Expenses')}
          >
            💳 Fuel & Expenses
          </button>
          <button 
            className={`nav-item ${currentView === 'Reports' ? 'active' : ''}`}
            onClick={() => setCurrentView('Reports')}
          >
            📈 Reports & Analytics
          </button>
          <button 
            className={`nav-item ${currentView === 'Settings' ? 'active' : ''}`}
            onClick={() => setCurrentView('Settings')}
          >
            ⚙️ Settings & RBAC
          </button>
        </nav>

        <div className="sidebar-footer">
          <span className="db-badge">🛢️ MongoDB Connected</span>
        </div>
      </aside>

      {/* Main Core View Area */}
      <div className="main-wrapper">
        {/* Top Navbar */}
        <header className="top-navbar">
          <div className="navbar-left">
            <span className="navbar-title">{currentView}</span>
          </div>

          <div className="navbar-right">
            {/* Quick role switcher header badge */}
            <div className="header-role-indicator">
              <span>Test Role:</span>
              <strong>{user.role}</strong>
            </div>

            <div className="profile-indicator">
              <span className="profile-icon">👤</span>
              <div className="profile-details">
                <span className="profile-name">{user.name}</span>
                <span className="profile-role">{user.role}</span>
              </div>
            </div>

            <button className="signout-btn" onClick={handleSignOut}>
              Sign Out
            </button>
          </div>
        </header>

        {/* Dynamic Panel Content Rendering */}
        <main className="content-area">
          {currentView === 'Dashboard' && <Dashboard token={user.token} />}
          {currentView === 'Vehicles' && <Vehicles token={user.token} userRole={user.role} />}
          {currentView === 'Drivers' && <Drivers token={user.token} userRole={user.role} />}
          {currentView === 'Trips' && <Trips token={user.token} userRole={user.role} />}
          {currentView === 'Maintenance' && <Maintenance token={user.token} userRole={user.role} />}
          {currentView === 'Expenses' && <Expenses token={user.token} userRole={user.role} />}
          {currentView === 'Reports' && <Reports token={user.token} />}
          {currentView === 'Settings' && <RBACSettings userRole={user.role} onSwitchRole={handleSwitchRole} />}
        </main>
      </div>
    </div>
  );
}

export default App;
