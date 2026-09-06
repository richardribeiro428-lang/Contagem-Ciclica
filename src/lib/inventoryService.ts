import {
  collection,
  doc,
  getDocs,
  getDocsFromServer,
  setDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';
import { CountSession, ProductPrice, SkuConversion } from '../types';
import { INITIAL_SESSIONS } from '../mockData';

export const DEFAULT_INVENTORY_TYPES: string[] = [
  'Cíclica',
  'Rotativa',
  'Geral',
  'Auditoria',
  'Amostragem'
];

// Initial default prices
export const DEFAULT_PRODUCT_PRICES: ProductPrice[] = [
  { sku: 'PP-48-5055-458', unitPrice: 42.50 },
  { sku: '48060', unitPrice: 18.90 },
  { sku: '48061', unitPrice: 24.50 },
  { sku: '48062', unitPrice: 110.00 },
  { sku: 'AUTO-9921', unitPrice: 85.00 },
  { sku: 'AUTO-4412', unitPrice: 140.20 },
  { sku: 'LOG-8820', unitPrice: 32.00 },
  { sku: 'AUTO-5510', unitPrice: 76.50 },
  { sku: 'LOG-9910', unitPrice: 19.90 },
  { sku: 'AUTO-1102', unitPrice: 210.00 }
];

// Initial default conversions (pieces per box)
export const DEFAULT_SKU_CONVERSIONS: SkuConversion[] = [
  { sku: 'PP-48-5055-458', piecesPerBox: 50 },
  { sku: '48060', piecesPerBox: 24 },
  { sku: '48061', piecesPerBox: 12 },
  { sku: '48062', piecesPerBox: 10 },
  { sku: 'AUTO-9921', piecesPerBox: 25 },
  { sku: 'AUTO-4412', piecesPerBox: 15 },
  { sku: 'LOG-8820', piecesPerBox: 100 },
  { sku: 'AUTO-5510', piecesPerBox: 10 },
  { sku: 'LOG-9910', piecesPerBox: 20 },
  { sku: 'AUTO-1102', piecesPerBox: 8 }
];

// Utility: Strips all undefined fields to prevent Firestore serialization errors
export function sanitizeForFirestore<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (key, value) => (value === undefined ? null : value))
  );
}

// --- SESSIONS ---
export function subscribeToSessions(
  onUpdate: (sessions: CountSession[]) => void,
  onError?: (err: any) => void
) {
  let isSubscribed = true;

  // 1. Initial immediate fetch from HTTP API + Firestore
  fetchSessionsDirectly()
    .then((list) => {
      if (isSubscribed && list.length > 0) {
        onUpdate(list);
      }
    })
    .catch((err) => console.warn('Initial fetchSessionsDirectly warning:', err));

  // 2. Server-Sent Events (SSE) listener for instant cross-device updates
  let eventSource: EventSource | null = null;
  try {
    if (typeof window !== 'undefined' && window.EventSource) {
      eventSource = new EventSource('/api/events');
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'sessions_updated') {
            fetchSessionsDirectly().then((list) => {
              if (isSubscribed && list.length > 0) {
                onUpdate(list);
              }
            });
          }
        } catch {
          // heartbeat or unparseable
        }
      };
      eventSource.onerror = () => {
        // SSE disconnected, fallback polling handles it
      };
    }
  } catch (e) {
    console.warn('SSE not available:', e);
  }

  // 3. Firestore onSnapshot real-time listener
  const colRef = collection(db, 'sessions');
  const unsubscribeFirestore = onSnapshot(
    colRef,
    async (snapshot) => {
      if (!isSubscribed) return;
      const hasSeeded = localStorage.getItem('ceva_firestore_seeded') === 'true';

      if (snapshot.empty && !hasSeeded) {
        localStorage.setItem('ceva_firestore_seeded', 'true');
        // Initial bootstrap if totally empty
        for (const sess of INITIAL_SESSIONS) {
          try {
            await setDoc(doc(db, 'sessions', sess.id), sanitizeForFirestore({
              ...sess,
              countUnit: sess.countUnit || 'pecas',
              items: sess.items || []
            }));
          } catch (e) {
            console.error('Error seeding initial session to Firestore:', e);
          }
        }
        onUpdate(INITIAL_SESSIONS);
      } else {
        const list: CountSession[] = [];
        snapshot.forEach((d) => {
          const data = d.data() as CountSession;
          // If a session has status 'Divergência', convert it to 'Concluída' so it properly finishes and moves to Concluídas
          const normalizedStatus: CountSession['status'] =
            data.status === 'Divergência' ? 'Concluída' : data.status;

          if (data.status === 'Divergência') {
            setDoc(doc(db, 'sessions', d.id), { status: 'Concluída' }, { merge: true }).catch(console.error);
          }

          list.push({ ...data, id: d.id, status: normalizedStatus });
        });
        // Sort newest first by creation date or code
        list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        if (list.length > 0) {
          onUpdate(list);
        }
      }
    },
    (err) => {
      console.warn('Firestore onSnapshot error, using server sync fallback:', err);
      if (onError) onError(err);
    }
  );

  // 4. Background heartbeat poll every 3.5 seconds to guarantee zero missed sessions on mobile
  const pollInterval = setInterval(() => {
    if (!isSubscribed) return;
    fetchSessionsDirectly()
      .then((list) => {
        if (isSubscribed && list.length > 0) {
          onUpdate(list);
        }
      })
      .catch(() => {});
  }, 3500);

  return () => {
    isSubscribed = false;
    clearInterval(pollInterval);
    if (eventSource) {
      eventSource.close();
    }
    unsubscribeFirestore();
  };
}

/**
 * Direct fetch to force immediate synchronization with Server API & Firestore
 * Bypasses local offline cache where possible to fetch counts created on PC
 */
export async function fetchSessionsDirectly(): Promise<CountSession[]> {
  // Try HTTP server endpoint first for instant response across devices
  try {
    const res = await fetch('/api/sessions?force_refresh=true');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
    }
  } catch (err) {
    // server API not reachable or static host fallback
  }

  // Fallback to Firestore directly
  const colRef = collection(db, 'sessions');
  let snapshot;
  try {
    snapshot = await getDocsFromServer(colRef);
  } catch (err) {
    console.warn('getDocsFromServer failed, trying getDocs fallback:', err);
    snapshot = await getDocs(colRef);
  }

  const list: CountSession[] = [];
  snapshot.forEach((d) => {
    const data = d.data() as CountSession;
    const normalizedStatus: CountSession['status'] =
      data.status === 'Divergência' ? 'Concluída' : data.status;
    list.push({ ...data, id: d.id, status: normalizedStatus });
  });

  list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  return list;
}

export async function saveSessionToFirestore(session: CountSession): Promise<void> {
  let savedServer = false;
  let savedFirestore = false;
  let serverError: any = null;
  let fsError: any = null;

  // 1. Post to Server API (triggers immediate broadcast to mobile and other devices)
  try {
    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session }),
    });
    if (res.ok) {
      savedServer = true;
    }
  } catch (e) {
    serverError = e;
  }

  // 2. Direct Firestore client write (dual-redundancy cloud save)
  try {
    const docRef = doc(db, 'sessions', session.id);
    const clean = sanitizeForFirestore({
      ...session,
      countUnit: session.countUnit || 'pecas',
      updatedAt: new Date().toISOString()
    });
    await setDoc(docRef, clean, { merge: true });
    savedFirestore = true;
  } catch (e) {
    fsError = e;
  }

  if (!savedServer && !savedFirestore) {
    console.error('All save attempts failed:', { serverError, fsError });
    throw new Error('Falha ao comunicar com o servidor e com o banco de dados.');
  }
}

export async function deleteSessionFromFirestore(sessionId: string): Promise<void> {
  // Delete from Server API
  try {
    await fetch(`/api/sessions/${sessionId}`, { method: 'DELETE' });
  } catch (e) {
    // continue
  }

  // Delete from Firestore directly
  try {
    const docRef = doc(db, 'sessions', sessionId);
    await deleteDoc(docRef);
  } catch (e) {
    // continue
  }
}

// --- INVENTORY TYPES ---
export function subscribeToInventoryTypes(
  onUpdate: (types: string[]) => void
) {
  const colRef = collection(db, 'inventoryTypes');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const customTypes: string[] = [];
      snapshot.forEach((d) => {
        const data = d.data() as { name: string };
        if (data.name) customTypes.push(data.name);
      });
      const combined = Array.from(new Set([...DEFAULT_INVENTORY_TYPES, ...customTypes]));
      onUpdate(combined);
    },
    (err) => {
      console.warn('Firestore onSnapshot inventoryTypes error:', err);
      onUpdate(DEFAULT_INVENTORY_TYPES);
    }
  );
}

export async function addInventoryTypeToFirestore(typeName: string): Promise<void> {
  const clean = typeName.trim();
  if (!clean) return;
  const id = clean.toLowerCase().replace(/[^a-z0-9]/g, '_');
  await setDoc(doc(db, 'inventoryTypes', id), sanitizeForFirestore({
    id,
    name: clean,
    createdAt: new Date().toISOString()
  }));
}

// --- PRODUCT PRICES ---
export function subscribeToProductPrices(
  onUpdate: (prices: Record<string, number>) => void
) {
  const colRef = collection(db, 'productPrices');
  return onSnapshot(
    colRef,
    async (snapshot) => {
      const hasSeeded = localStorage.getItem('ceva_prices_seeded') === 'true';
      if (snapshot.empty && !hasSeeded) {
        localStorage.setItem('ceva_prices_seeded', 'true');
        const map: Record<string, number> = {};
        for (const item of DEFAULT_PRODUCT_PRICES) {
          map[item.sku.toLowerCase()] = item.unitPrice;
          try {
            await setDoc(doc(db, 'productPrices', item.sku.toLowerCase()), sanitizeForFirestore(item));
          } catch (e) {
            console.error('Error seeding product price:', e);
          }
        }
        onUpdate(map);
      } else {
        const map: Record<string, number> = {};
        snapshot.forEach((d) => {
          const data = d.data() as ProductPrice;
          if (data && data.sku) {
            map[data.sku.toLowerCase()] = Number(data.unitPrice) || 0;
          }
        });
        onUpdate(map);
      }
    },
    (err) => {
      console.warn('Firestore onSnapshot productPrices error:', err);
    }
  );
}

export async function saveProductPricesToFirestore(prices: ProductPrice[]): Promise<void> {
  for (const p of prices) {
    const cleanSku = p.sku.trim().toLowerCase();
    if (!cleanSku) continue;
    await setDoc(doc(db, 'productPrices', cleanSku), sanitizeForFirestore({
      sku: cleanSku,
      unitPrice: Number(p.unitPrice) || 0,
      updatedAt: new Date().toISOString()
    }));
  }
}

export async function deleteProductPriceFromFirestore(sku: string): Promise<void> {
  const cleanSku = sku.trim().toLowerCase();
  if (!cleanSku) return;
  await deleteDoc(doc(db, 'productPrices', cleanSku));
}

export async function clearAllProductPricesFromFirestore(): Promise<void> {
  localStorage.setItem('ceva_prices_seeded', 'true');
  const snapshot = await getDocs(collection(db, 'productPrices'));
  for (const docItem of snapshot.docs) {
    await deleteDoc(docItem.ref);
  }
}

// --- SKU CONVERSIONS ---
export function subscribeToSkuConversions(
  onUpdate: (conversions: Record<string, number>) => void
) {
  const colRef = collection(db, 'skuConversions');
  return onSnapshot(
    colRef,
    async (snapshot) => {
      const hasSeeded = localStorage.getItem('ceva_conversions_seeded') === 'true';
      if (snapshot.empty && !hasSeeded) {
        localStorage.setItem('ceva_conversions_seeded', 'true');
        const map: Record<string, number> = {};
        for (const item of DEFAULT_SKU_CONVERSIONS) {
          map[item.sku.toLowerCase()] = item.piecesPerBox;
          try {
            await setDoc(doc(db, 'skuConversions', item.sku.toLowerCase()), sanitizeForFirestore(item));
          } catch (e) {
            console.error('Error seeding sku conversion:', e);
          }
        }
        onUpdate(map);
      } else {
        const map: Record<string, number> = {};
        snapshot.forEach((d) => {
          const data = d.data() as SkuConversion;
          if (data && data.sku) {
            map[data.sku.toLowerCase()] = Number(data.piecesPerBox) || 1;
          }
        });
        onUpdate(map);
      }
    },
    (err) => {
      console.warn('Firestore onSnapshot skuConversions error:', err);
    }
  );
}

export async function saveSkuConversionsToFirestore(conversions: SkuConversion[]): Promise<void> {
  for (const c of conversions) {
    const cleanSku = c.sku.trim().toLowerCase();
    if (!cleanSku) continue;
    await setDoc(doc(db, 'skuConversions', cleanSku), sanitizeForFirestore({
      sku: cleanSku,
      piecesPerBox: Number(c.piecesPerBox) || 1,
      updatedAt: new Date().toISOString()
    }));
  }
}

export async function deleteSkuConversionFromFirestore(sku: string): Promise<void> {
  const cleanSku = sku.trim().toLowerCase();
  if (!cleanSku) return;
  await deleteDoc(doc(db, 'skuConversions', cleanSku));
}

export async function clearAllSkuConversionsFromFirestore(): Promise<void> {
  localStorage.setItem('ceva_conversions_seeded', 'true');
  const snapshot = await getDocs(collection(db, 'skuConversions'));
  for (const docItem of snapshot.docs) {
    await deleteDoc(docItem.ref);
  }
}

export const saveProductPricesBatch = saveProductPricesToFirestore;
export const saveSkuConversionsBatch = saveSkuConversionsToFirestore;
