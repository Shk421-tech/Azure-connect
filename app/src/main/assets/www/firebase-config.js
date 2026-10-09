// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDBpwkWqeQTHPyzqN3I1agevJs8hPUkegk",
  authDomain: "azure-connect-5e2ec.firebaseapp.com",
  projectId: "azure-connect-5e2ec",
  storageBucket: "azure-connect-5e2ec.firebasestorage.app",
  messagingSenderId: "47260261243",
  appId: "1:47260261243:web:8b696a54e07da380283bde",
  measurementId: "G-ZGG3DH98RY"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);