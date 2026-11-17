export default function AdminLoading() {
  return (
    <div className="admin-loading-state" aria-label="Loading management overview">
      <div className="admin-loading-heading"><span /><span /><span /></div>
      <div className="admin-loading-metrics">{Array.from({ length: 5 }, (_, i) => <div className="admin-loading-card" key={i}><i /><b /><small /></div>)}</div>
      <div className="admin-loading-columns"><div className="admin-loading-panel"><b /><i /><i /><i /><i /></div><div className="admin-loading-panel"><b /><i /><i /><i /></div></div>
    </div>
  );
}
