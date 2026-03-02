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
  res.send("Rakshiva backend is running 🚀");
});

app.post("/send-notification", async (req, res) => {


  
  try {
    const { userId, title, body } = req.body;

    const guardianSnap = await admin
      .database()
      .ref(`users/${userId}/linkedGuardians`)
      .once("value");

    if (!guardianSnap.exists()) {
      return res.status(404).json({ error: "No guardians linked" });
    }

    const guardianIds = Object.keys(guardianSnap.val());
    const guardianId = guardianIds[0];

    const activeDeviceSnap = await admin
      .database()
      .ref(`guardians/${guardianId}/activeDevice`)
      .once("value");

    const activeDevice = activeDeviceSnap.val();

    if (!activeDevice) {
      return res.status(404).json({ error: "No active device found" });
    }

    const tokenSnap = await admin
      .database()
      .ref(`guardians/${guardianId}/devices/${activeDevice}/token`)
      .once("value");

    const token = tokenSnap.val();

    if (!token) {
      return res.status(404).json({ error: "No token found" });
    }



    const message = {
      notification: {
        title,
        body,
      },
      data: {
        route: "/guardian",
      },
      token,
    };

    const response = await admin.messaging().send(message);

    res.status(200).json({ success: true, response });
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