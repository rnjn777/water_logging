const API_BASE_URL = "https://water-logging.onrender.com";

fetch(`${API_BASE_URL}/api/reports`)
  .then(res => res.json())
  .then(data => {
    console.log("Reports from backend:", data);

    data.forEach(report => {
      L.circleMarker([report.latitude, report.longitude], {
        radius: 10,
        fillColor:
          report.severity === "HIGH" ? "#dc2626" :
          report.severity === "MEDIUM" ? "#f97316" :
          "#fde68a",
        fillOpacity: 0.85,
        color: "#fff",
        weight: 2
      })
      .addTo(map)
      .bindPopup(`
        <b>${report.location}</b><br>
        Severity: ${report.severity}<br>
        Rain: ${report.rainIntensity}<br>
        Waterlogged: ${report.is_waterlogged === true ? "YES" : "NO"}
      `);
    });
  })
  .catch(err => console.error("Backend not reachable", err));
