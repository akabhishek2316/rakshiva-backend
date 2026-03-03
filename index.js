const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Firebase Admin init using ENV variables
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  }),
  databaseURL: "https://rakshak-safety-app-default-rtdb.firebaseio.com/",
});

app.get("/", (req, res) => {
  res.send("Rakshiva backend is running for multi guardian 🚀");
});

app.post("/send-notification", async (req, res) => {
  try {
    const { userId, userName, lat, lng, city, phoneNumber } = req.body;

    const guardianSnap = await admin
      .database()
      .ref(`users/${userId}/linkedGuardians`)
      .once("value");

    if (!guardianSnap.exists()) {
      return res.status(404).json({ error: "No guardians linked" });
    }

    const guardianIds = Object.keys(guardianSnap.val());

    let tokens = [];

    // 🔥 Loop through all guardians
    for (const guardianId of guardianIds) {
      const activeDeviceSnap = await admin
        .database()
        .ref(`guardians/${guardianId}/activeDevice`)
        .once("value");

      const activeDevice = activeDeviceSnap.val();
      if (!activeDevice) continue;

      const tokenSnap = await admin
        .database()
        .ref(`guardians/${guardianId}/devices/${activeDevice}/token`)
        .once("value");

      const token = tokenSnap.val();
      if (token) {
        tokens.push(token);
      }
    }

    if (tokens.length === 0) {
      return res.status(404).json({ error: "No valid tokens found" });
    }

    const time = new Date().toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const emergencyId = `RK-${Date.now()}`;

    const message = {
  tokens: tokens,
  notification: {
    title: "🚨 EMERGENCY ALERT",
    body: `${userName} needs immediate assistance\n📍 ${city} • ${time}\nLive location active`,
  },
  data: {
    type: "severe_emergency",
    userName: userName,
    lat: String(lat),
    lng: String(lng),
    city: city,
    phoneNumber: phoneNumber || "",
    emergencyId: emergencyId,
    timestamp: String(Date.now()),
  },
  android: {
    priority: "high",
  },
};

const response = await admin.messaging().sendEachForMulticast(message);

    

    res.status(200).json({
      success: true,
      sent: response.successCount,
      failed: response.failureCount,
    });

  } catch (error) {
    console.error("Error sending notification:", error);
    res.status(500).json({ success: false, error });
  }
});

// ✅ IMPORTANT for Render
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});