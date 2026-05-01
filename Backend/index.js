require("dotenv").config();

const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
app.use(cors());
app.use(express.json());

// 🔐 ENV VARIABLES
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;

// ✅ Test route
app.get("/", (req, res) => {
  res.send("Backend is running 🚀");
});


// ===============================
// 🔐 OAUTH LOGIN
// ===============================
app.get("/auth/login", (req, res) => {
  const authUrl = `https://login.salesforce.com/services/oauth2/authorize?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}`;
  res.redirect(authUrl);
});


// ===============================
// 🔁 OAUTH CALLBACK
// ===============================
app.get("/auth/callback", async (req, res) => {
  const code = req.query.code;

  try {
    const tokenResponse = await axios.post(
      "https://login.salesforce.com/services/oauth2/token",
      null,
      {
        params: {
          grant_type: "authorization_code",
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          redirect_uri: REDIRECT_URI,
          code: code,
        },
      }
    );

    const { access_token, instance_url } = tokenResponse.data;

    // ✅ Redirect to FRONTEND (Netlify)
    res.redirect(
      `https://effervescent-llama-71da69.netlify.app/?access_token=${access_token}&instance_url=${instance_url}`
    );

  } catch (error) {
    console.error("OAuth Error:", error.response?.data || error.message);
    res.send("OAuth failed");
  }
});


// ===============================
// 🔥 FETCH VALIDATION RULES
// ===============================
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


// ===============================
// 🔥 TOGGLE VALIDATION RULE
// ===============================
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

    // 2️⃣ Update active status
    metadata.active = active;

    // 3️⃣ Update rule
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


// ===============================
// 🚀 START SERVER
// ===============================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});