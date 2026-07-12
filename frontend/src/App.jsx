import { useState, useEffect } from 'react';
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
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('transitops_user');
    return saved ? JSON.parse(saved) : null;
  });
  
  const [currentView, setCurrentView] = useState('Dashboard');
  const [permissions, setPermissions] = useState(() => {
    const saved = localStorage.getItem('transitops_rbac_matrix');
    return saved ? JSON.parse(saved) : null;
  });

  const fetchPermissions = async (token) => {
    try {
      const response = await fetch('http://localhost:5000/api/rbac', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setPermissions(data);
        localStorage.setItem('transitops_rbac_matrix', JSON.stringify(data));
      }
    } catch (err) {
      console.error('Failed to fetch RBAC settings from database:', err);
    }
  };

  useEffect(() => {
    if (user && user.token) {
      fetchPermissions(user.token);
      
      // If we are reload-retaining and the role is driver, route them to Trips
      if (user.role === 'Driver' && currentView === 'Dashboard') {
        setCurrentView('Trips');
      }
    }
    
    const handleRBACUpdate = () => {
      if (user && user.token) {
        fetchPermissions(user.token);
      }
    };
    
    window.addEventListener('rbac-updated', handleRBACUpdate);
    return () => window.removeEventListener('rbac-updated', handleRBACUpdate);
  }, [user]);

  const hasPermission = (role, feature) => {
    if (!permissions) {
      if (feature === 'View Dashboard KPIs') return role !== 'Driver';
      if (feature === 'Register/Edit Fleet Vehicles') return role === 'Fleet Manager';
      if (feature === 'Register/Edit Drivers Profiles') return role === 'Fleet Manager' || role === 'Safety Officer';
      if (feature === 'Create/Draft Dispatches') return role === 'Fleet Manager' || role === 'Driver';
      if (feature === 'Schedule Maintenance Logs') return role === 'Fleet Manager';
      if (feature === 'Log Fuel refills & Expenses') return role === 'Fleet Manager' || role === 'Financial Analyst';
      if (feature === 'View Financial Yields & ROI Reports') return role === 'Fleet Manager' || role === 'Financial Analyst';
      return false;
    }
    const row = permissions.find(p => p.feature === feature);
    if (!row) return false;
    
    const roleKey = 
      role === 'Fleet Manager' ? 'manager' :
      role === 'Driver' ? 'driver' :
      role === 'Safety Officer' ? 'safety' :
      role === 'Financial Analyst' ? 'analyst' : null;
      
    return roleKey ? row[roleKey] : false;
  };

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    localStorage.setItem('transitops_user', JSON.stringify(userData));
    if (userData.role === 'Driver') {
      setCurrentView('Trips');
    } else {
      setCurrentView('Dashboard');
    }
  };

  const handleSignOut = () => {
    setUser(null);
    localStorage.removeItem('transitops_user');
  };

  // Instant Switch Role to allow fast testing of RBAC policies
  const handleSwitchRole = (newRole) => {
    if (user) {
      const updatedUser = { ...user, role: newRole };
      setUser(updatedUser);
      localStorage.setItem('transitops_user', JSON.stringify(updatedUser));
      if (newRole === 'Driver') {
        setCurrentView('Trips');
      } else {
        setCurrentView('Dashboard');
      }
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
          {hasPermission(user.role, 'View Dashboard KPIs') && (
            <button 
              className={`nav-item ${currentView === 'Dashboard' ? 'active' : ''}`}
              onClick={() => setCurrentView('Dashboard')}
            >
              📊 Dashboard
            </button>
          )}
          {(user.role === 'Fleet Manager' || user.role === 'Driver' || hasPermission(user.role, 'Register/Edit Fleet Vehicles')) && (
            <button 
              className={`nav-item ${currentView === 'Vehicles' ? 'active' : ''}`}
              onClick={() => setCurrentView('Vehicles')}
            >
              🚚 Vehicle Registry
            </button>
          )}
          {(user.role === 'Safety Officer' || user.role === 'Driver' || hasPermission(user.role, 'Register/Edit Drivers Profiles')) && (
            <button 
              className={`nav-item ${currentView === 'Drivers' ? 'active' : ''}`}
              onClick={() => setCurrentView('Drivers')}
            >
              👨‍✈️ Drivers & Safety
            </button>
          )}
          {(user.role === 'Driver' || hasPermission(user.role, 'Create/Draft Dispatches')) && (
            <button 
              className={`nav-item ${currentView === 'Trips' ? 'active' : ''}`}
              onClick={() => setCurrentView('Trips')}
            >
              🚦 Trip Dispatcher
            </button>
          )}
          {(user.role === 'Fleet Manager' || user.role === 'Financial Analyst' || hasPermission(user.role, 'Schedule Maintenance Logs')) && (
            <button 
              className={`nav-item ${currentView === 'Maintenance' ? 'active' : ''}`}
              onClick={() => setCurrentView('Maintenance')}
            >
              🔧 Maintenance Shop
            </button>
          )}
          {(user.role === 'Financial Analyst' || hasPermission(user.role, 'Log Fuel refills & Expenses')) && (
            <button 
              className={`nav-item ${currentView === 'Expenses' ? 'active' : ''}`}
              onClick={() => setCurrentView('Expenses')}
            >
              💳 Fuel & Expenses
            </button>
          )}
          {(user.role === 'Fleet Manager' || user.role === 'Financial Analyst' || hasPermission(user.role, 'View Financial Yields & ROI Reports')) && (
            <button 
              className={`nav-item ${currentView === 'Reports' ? 'active' : ''}`}
              onClick={() => setCurrentView('Reports')}
            >
              📈 Reports & Analytics
            </button>
          )}
          {user.role === 'Fleet Manager' && (
            <button 
              className={`nav-item ${currentView === 'Settings' ? 'active' : ''}`}
              onClick={() => setCurrentView('Settings')}
            >
              ⚙️ Settings & RBAC
            </button>
          )}
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
          {currentView === 'Dashboard' && <Dashboard token={user.token} user={user} />}
          {currentView === 'Vehicles' && <Vehicles token={user.token} userRole={user.role} user={user} hasPermission={hasPermission} />}
          {currentView === 'Drivers' && <Drivers token={user.token} userRole={user.role} user={user} hasPermission={hasPermission} />}
          {currentView === 'Trips' && <Trips token={user.token} userRole={user.role} user={user} hasPermission={hasPermission} />}
          {currentView === 'Maintenance' && <Maintenance token={user.token} userRole={user.role} user={user} hasPermission={hasPermission} />}
          {currentView === 'Expenses' && <Expenses token={user.token} userRole={user.role} user={user} hasPermission={hasPermission} />}
          {currentView === 'Reports' && <Reports token={user.token} userRole={user.role} user={user} hasPermission={hasPermission} />}
          {currentView === 'Settings' && user.role === 'Fleet Manager' && <RBACSettings token={user.token} userRole={user.role} onSwitchRole={handleSwitchRole} />}
        </main>
      </div>
    </div>
  );
}

export default App;
