import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';


const firebaseConfig = {

  apiKey: "AIzaSyA4R3rFHSuVVslPEMZYiIzUHXFtLzkduTw",
  authDomain: "marilandiameteorologia.firebaseapp.com",
  projectId: "marilandiameteorologia",
  storageBucket: "marilandiameteorologia.firebasestorage.app",
  messagingSenderId: "579594038450",
  appId: "1:579594038450:web:c09381881108d0612d2dab",
  measurementId: "G-ZH3J51CSHM",
  databaseURL:"https://marilandiameteorologia-default-rtdb.firebaseio.com/"

};


// const app = initializeApp(firebaseConfig);
// const db = getFirestore(app);

// export { db };
export const app = initializeApp(firebaseConfig);