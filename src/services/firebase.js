import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAHIfWuhTU7uCr8K1gAMIt7p6Jxtxg8KN8",
  authDomain: "producao-egaplast.firebaseapp.com",
  projectId: "producao-egaplast",
  storageBucket: "producao-egaplast.firebasestorage.app",
  messagingSenderId: "595683986453",
  appId: "1:595683986453:web:440a4e2406d20b3eb1121c",
  measurementId: "G-PJT602CN89"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Inicializa e exporta o banco de dados (Firestore)
export const db = getFirestore(app);