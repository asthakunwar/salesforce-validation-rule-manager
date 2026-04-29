const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Test route
app.get("/", (req, res) => {
  res.send("Backend is running 🚀");
});

// 🔥 Fetch validation rules
app.get("/validation-rules", async (req, res) => {
  const { accessToken, instanceUrl } = req.query;

  try {
    const response = await axios.get(
      `${instanceUrl}/services/data/v60.0/tooling/query?q=SELECT Id, ValidationName, Active FROM ValidationRule`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    res.json(response.data.records);
  } catch (error) {
    console.error("Fetch Error:", error.response?.data || error.message);
    res.status(500).json({ error: "Error fetching rules" });
  }
});

// 🔥 Toggle validation rule
app.post("/toggle-rule", async (req, res) => {
  const { ruleId, active, accessToken, instanceUrl } = req.body;

  try {
    console.log("Toggling rule:", ruleId, "→", active);

    // 1️⃣ Get full metadata
    const getRes = await axios.get(
      `${instanceUrl}/services/data/v60.0/tooling/sobjects/ValidationRule/${ruleId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const metadata = getRes.data.Metadata;

    // 2️⃣ Update active value
    metadata.active = active;

    // 3️⃣ Send update
    await axios.patch(
      `${instanceUrl}/services/data/v60.0/tooling/sobjects/ValidationRule/${ruleId}`,
      {
        Metadata: metadata,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Toggle Error:", error.response?.data || error.message);
    res.status(500).json({ error: "Toggle failed" });
  }
});

// ✅ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});