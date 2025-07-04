// lib/fetchWeatherData.ts
import { db } from './firebaseConfig';
import { collection, getDocs } from 'firebase/firestore';

export async function fetchWeatherData() {
  const snapshot = await getDocs(collection(db, 'logs'));
  const data = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  return data;
}
