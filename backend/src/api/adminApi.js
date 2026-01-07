const API_BASE = import.meta.env.VITE_API_URL;
// example: https://your-backend.onrender.com

export const getReports = async (token) => {
  const res = await fetch(`${API_BASE}/api/reports/admin`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) throw new Error("Failed to fetch reports");
  return res.json();
};

export const approveReport = async (reportId, token) => {
  const res = await fetch(
    `${API_BASE}/api/reports/${reportId}/approve`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!res.ok) throw new Error("Approval failed");
  return res.json();
};
