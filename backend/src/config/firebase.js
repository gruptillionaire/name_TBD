const admin = require('firebase-admin');

let initialized = false;

function initializeFirebase() {
  if (initialized || admin.apps.length) {
    return true;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey || projectId === 'your-project-id') {
    console.warn('Firebase credentials not configured - auth endpoints will not work');
    return false;
  }

  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey
      })
    });
    initialized = true;
    return true;
  } catch (error) {
    console.error('Failed to initialize Firebase:', error.message);
    return false;
  }
}

// Try to initialize on load
initializeFirebase();

module.exports = admin;
module.exports.isInitialized = () => initialized || admin.apps.length > 0;
