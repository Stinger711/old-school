import { initializeApp }               from 'firebase/app';
import {
  getFirestore, collection, doc,
  addDoc, updateDoc, deleteDoc,
  getDoc, getDocs, query, where, orderBy,
  serverTimestamp, increment,
} from 'firebase/firestore';
import {
  getStorage, ref, uploadBytes, getDownloadURL, deleteObject,
} from 'firebase/storage';
import { firebaseConfig } from './config';

const app = initializeApp(firebaseConfig);
export const db      = getFirestore(app);
export const storage = getStorage(app);

// ── Storage helpers ──────────────────────────────────────────────

export async function uploadFile(path, blob) {
  const r = ref(storage, path);
  await uploadBytes(r, blob);
  return getDownloadURL(r);
}

export async function removeFile(path) {
  try { await deleteObject(ref(storage, path)); } catch {}
}

// ── People ───────────────────────────────────────────────────────

export async function createPerson(data) {
  const docRef = await addDoc(collection(db, 'people'), {
    ...data,
    email: data.email?.toLowerCase().trim(),
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updatePerson(id, data) {
  const payload = { ...data };
  if (payload.email) payload.email = payload.email.toLowerCase().trim();
  await updateDoc(doc(db, 'people', id), payload);
}

export async function getPerson(id) {
  const snap = await getDoc(doc(db, 'people', id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function findPersonByEmail(email) {
  const q    = query(collection(db, 'people'), where('email', '==', email.toLowerCase().trim()));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
}

export async function searchPeople(term) {
  const snap = await getDocs(collection(db, 'people'));
  const t    = term.toLowerCase();
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(p => p.name?.toLowerCase().includes(t) || p.email?.toLowerCase().includes(t))
    .slice(0, 8);
}

export async function getAllPeople() {
  const snap = await getDocs(query(collection(db, 'people'), orderBy('name')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getNotifiablePeople() {
  const q    = query(collection(db, 'people'), where('notifyOnUpload', '==', true));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ── Photos ───────────────────────────────────────────────────────

export async function createPhoto(data) {
  const docRef = await addDoc(collection(db, 'photos'), {
    ...data,
    uploadedAt:  serverTimestamp(),
    taggedCount: 0,
  });
  return docRef.id;
}

export async function getPhotos() {
  const q    = query(collection(db, 'photos'), orderBy('uploadedAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getPhoto(id) {
  const snap = await getDoc(doc(db, 'photos', id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function deletePhoto(id) {
  await deleteDoc(doc(db, 'photos', id));
}

// ── Markers ──────────────────────────────────────────────────────

export async function createMarker(data) {
  const docRef = await addDoc(collection(db, 'markers'), data);
  // increment tag count on parent photo
  await updateDoc(doc(db, 'photos', data.photoId), { taggedCount: increment(1) });
  return docRef.id;
}

export async function getMarkersForPhoto(photoId) {
  const q    = query(collection(db, 'markers'), where('photoId', '==', photoId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function deleteMarker(id, photoId) {
  await deleteDoc(doc(db, 'markers', id));
  if (photoId) {
    await updateDoc(doc(db, 'photos', photoId), { taggedCount: increment(-1) });
  }
}
