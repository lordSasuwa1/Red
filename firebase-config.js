// ===== CONFIGURATION FIREBASE =====
// IMPORTANT: Remplacez ces valeurs par VOTRE configuration Firebase
// Pour obtenir votre configuration:
// 1. Allez sur https://console.firebase.google.com
// 2. Créez un nouveau projet (ou utilisez un existant)
// 3. Allez dans Paramètres du projet > Général
// 4. Dans "Vos applications", cliquez sur </> (Web)
// 5. Copiez la configuration firebaseConfig
// 6. Collez-la ci-dessous

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBeeOEOf1rn0cI_NcLB_8rBCh_sN2Mvla0",
  authDomain: "red-web-form-lord.firebaseapp.com",
  databaseURL: "https://red-web-form-lord-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "red-web-form-lord",
  storageBucket: "red-web-form-lord.firebasestorage.app",
  messagingSenderId: "16458712833",
  appId: "1:16458712833:web:cd7eded319f91935fdbd00",
  measurementId: "G-C05JYE6PWS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
// NE PAS MODIFIER EN DESSOUS
export default firebaseConfig;
