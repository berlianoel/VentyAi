import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"

let firebaseConfig: any = null

// Only initialize Firebase on the client side
if (typeof window !== "undefined") {
  firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyCv-0aOPZQOnqp_foQ3Hbmypq4r8Ey-ow8",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "ventychat-bot.firebaseapp.com",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "ventychat-bot",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "ventychat-bot.firebasestorage.app",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "293749031455",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:293749031455:web:b6c1d30fb389a61cf14b2a",
  }
}

let app: any = null
let auth: any = null

// Initialize Firebase only on client side
if (typeof window !== "undefined" && firebaseConfig) {
  try {
    app = initializeApp(firebaseConfig)
    auth = getAuth(app)
  } catch (error) {
    console.error("Firebase initialization error:", error)
  }
}

export { auth }
export default app
