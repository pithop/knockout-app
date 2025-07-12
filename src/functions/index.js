const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

exports.markLegacyUsers = functions.firestore
  .document('artifacts/project-knockout-esports/users/{userId}')
  .onCreate((snap, context) => {
    return snap.ref.update({
      legacyUser: true,
      premiumAccess: true
    });
  });