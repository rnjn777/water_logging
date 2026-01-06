import { useEffect, useState } from "react";
import { getReports, approveReport } from "../api/adminApi";

export default function AdminReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("token"); // admin JWT

  const loadReports = async () => {
    try {
      const data = await getReports(token);
      setReports(data);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handleApprove = async (id) => {
    try {
      await approveReport(id, token);
      alert("Report approved ✅");
      loadReports(); // 🔄 refresh list
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <h2>Admin Reports</h2>

      {reports.map((r) => (
        <div
          key={r.id}
          style={{
            border: "1px solid #ccc",
            padding: "10px",
            marginBottom: "10px",
          }}
        >
          <p><b>Location:</b> {r.location}</p>
          <p><b>Severity:</b> {r.severity}</p>
          <p><b>Status:</b> {r.is_approved ? "Approved" : "Pending"}</p>

          {!r.is_approved && (
            <button onClick={() => handleApprove(r.id)}>
              Approve
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
