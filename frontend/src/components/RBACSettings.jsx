function RBACSettings({ userRole, onSwitchRole }) {
  
  // Matrix definitions matching mockup flow
  const rolesInfo = [
    {
      role: 'Fleet Manager',
      desc: 'Full administrative access. Oversees fleet assets, vehicle lifecycle, maintenance repairs, and operational profitability.',
      color: 'var(--status-trip)'
    },
    {
      role: 'Driver',
      desc: 'Creates dispatch trips, assigns drivers and vehicles, and updates active delivery status records.',
      color: 'var(--status-available)'
    },
    {
      role: 'Safety Officer',
      desc: 'Monitors driver files, compliance indices, driving history logs, and driving license expirations.',
      color: 'var(--status-shop)'
    },
    {
      role: 'Financial Analyst',
      desc: 'Financial ledger auditor. Enters fuel/toll receipts, reviews operational cost statistics, and audits vehicle yields.',
      color: 'var(--accent-color)'
    }
  ];

  const permissionsMatrix = [
    { feature: 'View Dashboard KPIs', manager: true, driver: true, safety: true, analyst: true },
    { feature: 'Register/Edit Fleet Vehicles', manager: true, driver: false, safety: false, analyst: false },
    { feature: 'Register/Edit Drivers Profiles', manager: true, driver: false, safety: true, analyst: false },
    { feature: 'Create/Draft Dispatches', manager: true, driver: true, safety: false, analyst: false },
    { feature: 'Dispatch Active Trips', manager: true, driver: true, safety: false, analyst: false },
    { feature: 'Complete/Cancel Trips', manager: true, driver: true, safety: false, analyst: false },
    { feature: 'Schedule Maintenance Logs', manager: true, driver: false, safety: false, analyst: false },
    { feature: 'Close Maintenance Tickets', manager: true, driver: false, safety: false, analyst: false },
    { feature: 'Log Fuel refills & Expenses', manager: true, driver: false, safety: false, analyst: true },
    { feature: 'View Financial Yields & ROI Reports', manager: true, driver: true, safety: true, analyst: true },
    { feature: 'Export Report Spreadsheets (CSV)', manager: true, driver: true, safety: true, analyst: true }
  ];

  return (
    <div className="view-container">
      {/* View Header */}
      <div className="view-header">
        <div>
          <h2>System Permissions & Settings</h2>
          <p className="subtitle">Review security grids and toggle active test roles for RBAC verification</p>
        </div>
      </div>

      <div className="dispatcher-split-layout" style={{ marginTop: '2rem' }}>
        {/* Left Side: Role details card list */}
        <div className="dispatcher-form-panel flex-1">
          <h3>Role Descriptions</h3>
          <p className="panel-subtitle">Access scopes configured for TransitOps roles</p>

          <div className="roles-info-list" style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {rolesInfo.map((info) => (
              <div key={info.role} className="role-info-card" style={{ borderLeft: `3px solid ${info.color}`, background: 'var(--surface-header)', padding: '1rem', borderRadius: '4px' }}>
                <strong style={{ color: 'var(--text-primary)', fontSize: '0.95rem' }}>{info.role}</strong>
                <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginTop: '0.35rem', lineHeight: '1.4' }}>
                  {info.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Matrix list */}
        <div className="dispatcher-list-panel flex-2">
          <h3>Capabilities Grid (RBAC Matrix)</h3>
          <p className="panel-subtitle">Matrix of system resources and permissions mapped by profile</p>

          <div className="table-responsive" style={{ marginTop: '1.25rem' }}>
            <table className="flat-table">
              <thead>
                <tr>
                  <th>Resource Scope</th>
                  <th style={{ textAlign: 'center' }}>Manager</th>
                  <th style={{ textAlign: 'center' }}>Driver</th>
                  <th style={{ textAlign: 'center' }}>Safety</th>
                  <th style={{ textAlign: 'center' }}>Analyst</th>
                </tr>
              </thead>
              <tbody>
                {permissionsMatrix.map((perm, idx) => (
                  <tr key={idx}>
                    <td className="font-bold" style={{ fontSize: '0.85rem' }}>{perm.feature}</td>
                    <td style={{ textAlign: 'center', fontSize: '1.1rem' }}>
                      {perm.manager ? <span style={{ color: 'var(--status-available)' }}>✓</span> : <span style={{ color: 'var(--status-retired)' }}>✕</span>}
                    </td>
                    <td style={{ textAlign: 'center', fontSize: '1.1rem' }}>
                      {perm.driver ? <span style={{ color: 'var(--status-available)' }}>✓</span> : <span style={{ color: 'var(--status-retired)' }}>✕</span>}
                    </td>
                    <td style={{ textAlign: 'center', fontSize: '1.1rem' }}>
                      {perm.safety ? <span style={{ color: 'var(--status-available)' }}>✓</span> : <span style={{ color: 'var(--status-retired)' }}>✕</span>}
                    </td>
                    <td style={{ textAlign: 'center', fontSize: '1.1rem' }}>
                      {perm.analyst ? <span style={{ color: 'var(--status-available)' }}>✓</span> : <span style={{ color: 'var(--status-retired)' }}>✕</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RBACSettings;
