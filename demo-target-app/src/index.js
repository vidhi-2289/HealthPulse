const express = require("express");

const app = express();
const PORT = process.env.PORT || 5001;

app.get("/", (_req, res) => {
  res.json({
    app: "demo-target-app",
    message: "Application running",
    timestamp: new Date().toISOString(),
  });
});

app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "UP",
    service: "demo-target-app",
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, () => {
  console.log(`Demo target app listening on ${PORT}`);
});
