import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy
} from 'firebase/firestore';
import { db } from './firebase';
import { CountSession, InventoryType, ProductPrice, SkuConversion } from '../types';
import { INITIAL_SESSIONS } from '../mockData';

export const DEFAULT_INVENTORY_TYPES: string[] = [
  'Cíclica',
  'Rotativa',
  'Geral',
  'Auditoria',
  'Amostragem'
];

// Initial default prices for demo
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

// --- SESSIONS DELETION TRACKING ---
export function getLocalDeletedSessionIds(): Set<string> {
  try {
    const raw = localStorage.getItem('ceva_deleted_session_ids');
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

export function addLocalDeletedSessionId(sessionId: string): void {
  try {
    const set = getLocalDeletedSessionIds();
    set.add(sessionId);
    localStorage.setItem('ceva_deleted_session_ids', JSON.stringify(Array.from(set)));
  } catch (e) {
    console.error('Error saving deleted ID locally', e);
  }
}

// --- SESSIONS ---
export function subscribeToSessions(
  onUpdate: (sessions: CountSession[]) => void,
  onError?: (err: any) => void
) {
  const colRef = collection(db, 'sessions');
  const deletedColRef = collection(db, 'deleted_sessions');

  const inMemoryDeletedIds = getLocalDeletedSessionIds();

  // Also listen in real-time to deleted_sessions so any deletion across tabs or devices is respected
  onSnapshot(deletedColRef, (delSnap) => {
    delSnap.forEach((d) => {
      inMemoryDeletedIds.add(d.id);
      addLocalDeletedSessionId(d.id);
    });
  });

  return onSnapshot(
    colRef,
    async (snapshot) => {
      const hasInitialized = localStorage.getItem('ceva_db_seeded_once') === 'true';

      if (snapshot.empty) {
        // Only seed on first ever launch if NOT already initialized and NO sessions were deleted
        if (!hasInitialized && inMemoryDeletedIds.size === 0) {
          localStorage.setItem('ceva_db_seeded_once', 'true');
          for (const sess of INITIAL_SESSIONS) {
            if (!inMemoryDeletedIds.has(sess.id)) {
              try {
                await setDoc(doc(db, 'sessions', sess.id), {
                  ...sess,
                  countUnit: sess.countUnit || 'pecas',
                  items: sess.items || []
                });
              } catch (e) {
                console.error('Error seeding session to Firestore', e);
              }
            }
          }
          const filteredInitial = INITIAL_SESSIONS.filter((s) => !inMemoryDeletedIds.has(s.id));
          onUpdate(filteredInitial);
        } else {
          // If empty because user deleted all sessions or was already initialized, emit empty array!
          onUpdate([]);
        }
      } else {
        localStorage.setItem('ceva_db_seeded_once', 'true');
        const list: CountSession[] = [];
        snapshot.forEach((d) => {
          // Double verify: if marked as deleted, ignore completely!
          if (!inMemoryDeletedIds.has(d.id)) {
            const data = d.data() as CountSession;
            list.push({ ...data, id: d.id });
          }
        });
        // Sort newest first
        list.sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime());
        onUpdate(list);
      }
    },
    (err) => {
      console.warn('Firestore onSnapshot sessions error, using local fallback:', err);
      if (onError) onError(err);
    }
  );
}

export async function saveSessionToFirestore(session: CountSession): Promise<void> {
  const docRef = doc(db, 'sessions', session.id);
  await setDoc(docRef, {
    ...session,
    countUnit: session.countUnit || 'pecas',
    updatedAt: new Date().toISOString()
  });
}

export async function deleteSessionFromFirestore(sessionId: string): Promise<void> {
  // 1. Delete session from sessions collection
  const docRef = doc(db, 'sessions', sessionId);
  await deleteDoc(docRef);

  // 2. Persist to deleted_sessions collection so it is never re-seeded or resurrected
  try {
    const deletedDocRef = doc(db, 'deleted_sessions', sessionId);
    await setDoc(deletedDocRef, {
      id: sessionId,
      deletedAt: new Date().toISOString()
    });
  } catch (e) {
    console.error('Error recording deletion in Firestore:', e);
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
      // Merge defaults with custom, keeping unique
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
  await setDoc(doc(db, 'inventoryTypes', id), {
    id,
    name: clean,
    createdAt: new Date().toISOString()
  });
}

// --- PRODUCT PRICES ---
export function subscribeToProductPrices(
  onUpdate: (pricesMap: Record<string, number>) => void
) {
  const colRef = collection(db, 'productPrices');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const map: Record<string, number> = {};
      if (snapshot.empty) {
        // Seed default prices
        DEFAULT_PRODUCT_PRICES.forEach(async (p) => {
          try {
            await setDoc(doc(db, 'productPrices', p.sku), p);
          } catch (e) {
            console.error('Error seeding price', e);
          }
        });
        DEFAULT_PRODUCT_PRICES.forEach((p) => {
          map[p.sku.toLowerCase()] = p.unitPrice;
        });
      } else {
        snapshot.forEach((d) => {
          const data = d.data() as ProductPrice;
          if (data.sku && typeof data.unitPrice === 'number') {
            map[data.sku.toLowerCase()] = data.unitPrice;
          }
        });
      }
      onUpdate(map);
    },
    (err) => {
      console.warn('Firestore productPrices fallback:', err);
      const map: Record<string, number> = {};
      DEFAULT_PRODUCT_PRICES.forEach((p) => {
        map[p.sku.toLowerCase()] = p.unitPrice;
      });
      onUpdate(map);
    }
  );
}

export async function saveProductPricesBatch(prices: ProductPrice[]): Promise<void> {
  for (const item of prices) {
    if (!item.sku || typeof item.unitPrice !== 'number') continue;
    const cleanSku = item.sku.trim();
    await setDoc(doc(db, 'productPrices', cleanSku), {
      sku: cleanSku,
      unitPrice: item.unitPrice,
      updatedAt: new Date().toISOString()
    });
  }
}

// --- SKU CONVERSIONS (PEÇAS POR CAIXA) ---
export function subscribeToSkuConversions(
  onUpdate: (conversionsMap: Record<string, number>) => void
) {
  const colRef = collection(db, 'skuConversions');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const map: Record<string, number> = {};
      if (snapshot.empty) {
        // Seed default conversions
        DEFAULT_SKU_CONVERSIONS.forEach(async (c) => {
          try {
            await setDoc(doc(db, 'skuConversions', c.sku), c);
          } catch (e) {
            console.error('Error seeding conversion', e);
          }
        });
        DEFAULT_SKU_CONVERSIONS.forEach((c) => {
          map[c.sku.toLowerCase()] = c.piecesPerBox;
        });
      } else {
        snapshot.forEach((d) => {
          const data = d.data() as SkuConversion;
          if (data.sku && typeof data.piecesPerBox === 'number') {
            map[data.sku.toLowerCase()] = data.piecesPerBox;
          }
        });
      }
      onUpdate(map);
    },
    (err) => {
      console.warn('Firestore skuConversions fallback:', err);
      const map: Record<string, number> = {};
      DEFAULT_SKU_CONVERSIONS.forEach((c) => {
        map[c.sku.toLowerCase()] = c.piecesPerBox;
      });
      onUpdate(map);
    }
  );
}

export async function saveSkuConversionsBatch(conversions: SkuConversion[]): Promise<void> {
  for (const item of conversions) {
    if (!item.sku || typeof item.piecesPerBox !== 'number') continue;
    const cleanSku = item.sku.trim();
    await setDoc(doc(db, 'skuConversions', cleanSku), {
      sku: cleanSku,
      piecesPerBox: Math.max(1, item.piecesPerBox),
      updatedAt: new Date().toISOString()
    });
  }
}
