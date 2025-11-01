import admin from "firebase-admin";
import { readFileSync } from "fs";
import path from "path";

const keyPath = path.resolve("./firebase/serviceAccountKey.json");
const serviceAccount = JSON.parse(readFileSync(keyPath, "utf8"));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const auth = admin.auth();
const db = admin.firestore();
console.log("Using project:", admin.app().options.credential.projectId);


export { admin, auth, db };
