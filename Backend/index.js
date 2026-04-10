require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 5000;

let codeVerifier = '';

// 🔐 Step 1: Redirect to Salesforce Login (PKCE Enabled)
app.get('/login', (req, res) => {
  codeVerifier = crypto.randomBytes(32).toString('hex');

  const hash = crypto.createHash('sha256').update(codeVerifier).digest();
  const codeChallenge = hash.toString('base64url');

  const authUrl = `https://login.salesforce.com/services/oauth2/authorize?response_type=code&client_id=${process.env.CLIENT_ID}&redirect_uri=${process.env.REDIRECT_URI}&code_challenge=${codeChallenge}&code_challenge_method=S256`;

  res.redirect(authUrl);
});

// 🔁 Step 2: Callback after login
app.get('/callback', async (req, res) => {
  const code = req.query.code;

  try {
    const response = await axios.post(
      'https://login.salesforce.com/services/oauth2/token',
      null,
      {
        params: {
          grant_type: 'authorization_code',
          client_id: process.env.CLIENT_ID,
          client_secret: process.env.CLIENT_SECRET,
          redirect_uri: process.env.REDIRECT_URI,
          code: code,
          code_verifier: codeVerifier // ✅ IMPORTANT
        }
      }
    );

    const accessToken = response.data.access_token;
    const instanceUrl = response.data.instance_url;

    res.redirect(
  `http://localhost:3000?accessToken=${accessToken}&instanceUrl=${instanceUrl}`
);

  } catch (error) {
    console.error(error.response?.data || error);
    res.send("Error during authentication ❌");
  }
});

// 🔹 Fetch Validation Rules
app.get('/validation-rules', async (req, res) => {
  const { accessToken, instanceUrl } = req.query;

  try {
    const response = await axios.get(
      `${instanceUrl}/services/data/v58.0/tooling/query`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        },
        params: {
          q: "SELECT Id, ValidationName, Active FROM ValidationRule WHERE EntityDefinition.QualifiedApiName='Account'"
        }
      }
    );

    res.json(response.data.records);

  } catch (error) {
    console.error(error.response?.data || error);
    res.send("Error fetching validation rules ❌");
  }
});

// 🔹 Toggle Validation Rule
app.get('/toggle-rule', async (req, res) => {
  const { accessToken, instanceUrl, ruleId, isActive } = req.query;

  try {
    // Step 1: Get full metadata
    const getResponse = await axios.get(
      `${instanceUrl}/services/data/v58.0/tooling/sobjects/ValidationRule/${ruleId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );

    const metadata = getResponse.data.Metadata;

    // Step 2: Update active field
    metadata.active = isActive === 'true';

    // Step 3: Update rule
    await axios.patch(
      `${instanceUrl}/services/data/v58.0/tooling/sobjects/ValidationRule/${ruleId}`,
      {
        Metadata: metadata
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    res.send("Validation Rule Updated ✅");

  } catch (error) {
    console.error(error.response?.data || error);
    res.send("Error updating rule ❌");
  }
});

// Test route
app.get('/', (req, res) => {
  res.send('Backend is running 🚀');
});

// 🚀 Start server (KEEP AT END)
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});