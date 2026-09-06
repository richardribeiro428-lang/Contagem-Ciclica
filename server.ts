import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  initializeFirestore,
} from 'firebase/firestore';
import config from './firebase-applet-config.json';
import { CountSession, InventoryItem, ProductPrice, SkuConversion } from './src/types';
import { INITIAL_SESSIONS } from './src/mockData';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const app = express();

// Increase payload limit for large Excel lists
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// CORS & Connection headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Initialize Firebase on Server
const firebaseApp = initializeApp({
  apiKey: config.apiKey,
  authDomain: config.authDomain,
  projectId: config.projectId,
  storageBucket: config.storageBucket,
  messagingSenderId: config.messagingSenderId,
  appId: config.appId,
});

const customDbId = (config as Record<string, any>).firestoreDatabaseId;
const db = customDbId
  ? initializeFirestore(firebaseApp, { experimentalAutoDetectLongPolling: true }, customDbId)
  : initializeFirestore(firebaseApp, { experimentalAutoDetectLongPolling: true });

function sanitizeForFirestore<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (key, value) => (value === undefined ? null : value))
  );
}

// In-Memory Shared Cache for Instant Multi-Device Speed
let inMemorySessions: CountSession[] = [...INITIAL_SESSIONS];
let sseClients: Response[] = [];

function broadcastSessionsUpdate() {
  const payload = JSON.stringify({
    type: 'sessions_updated',
    count: inMemorySessions.length,
    timestamp: new Date().toISOString(),
  });
  sseClients.forEach((client) => {
    try {
      client.write(`data: ${payload}\n\n`);
    } catch {
      // client disconnected
    }
  });
}

// Load sessions from Firestore on startup
async function loadInitialDataFromFirestore() {
  try {
    const snap = await getDocs(collection(db, 'sessions'));
    if (!snap.empty) {
      const list: CountSession[] = [];
      snap.forEach((d) => {
        const data = d.data() as CountSession;
        list.push({ ...data, id: d.id });
      });
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      inMemorySessions = list;
      console.log(`[Server] Loaded ${list.length} sessions from Firestore.`);
    } else {
      console.log('[Server] Firestore sessions collection is empty, seeding initial sessions...');
      for (const sess of INITIAL_SESSIONS) {
        await setDoc(doc(db, 'sessions', sess.id), sanitizeForFirestore(sess), { merge: true });
      }
      inMemorySessions = [...INITIAL_SESSIONS];
    }
  } catch (err) {
    console.warn('[Server] Could not preload Firestore sessions on startup:', err);
  }
}

// ==========================================
// API ROUTES
// ==========================================

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    serverTime: new Date().toISOString(),
    sessionsCount: inMemorySessions.length,
    connectedClients: sseClients.length,
  });
});

// SSE endpoint for live real-time push to all devices
app.get('/api/events', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  sseClients.push(res);

  // Send initial handshake
  res.write(`data: ${JSON.stringify({ type: 'connected', time: new Date().toISOString() })}\n\n`);

  // Periodic heartbeat
  const heartbeat = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch {
      clearInterval(heartbeat);
    }
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients = sseClients.filter((c) => c !== res);
  });
});

// Get all sessions
app.get('/api/sessions', async (req: Request, res: Response) => {
  try {
    // If query ?force_refresh=true, pull from Firestore
    if (req.query.force_refresh === 'true') {
      const snap = await getDocs(collection(db, 'sessions'));
      const list: CountSession[] = [];
      snap.forEach((d) => {
        list.push({ ...(d.data() as CountSession), id: d.id });
      });
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      inMemorySessions = list;
    }
    res.json(inMemorySessions);
  } catch (err: any) {
    console.error('[API GET /api/sessions error]:', err);
    // Return in-memory fallback
    res.json(inMemorySessions);
  }
});

// Create or update a session
app.post('/api/sessions', async (req: Request, res: Response) => {
  try {
    const raw = req.body.session || req.body;
    if (!raw || !raw.id) {
      return res.status(400).json({ error: 'Session object with valid ID is required' });
    }

    const session: CountSession = {
      ...raw,
      updatedAt: new Date().toISOString(),
    };

    // Update in-memory cache immediately
    const existingIndex = inMemorySessions.findIndex((s) => s.id === session.id);
    if (existingIndex >= 0) {
      inMemorySessions[existingIndex] = session;
    } else {
      inMemorySessions.unshift(session);
    }

    // Save to Firestore
    try {
      await setDoc(doc(db, 'sessions', session.id), sanitizeForFirestore(session), { merge: true });
    } catch (fsErr) {
      console.error('[API POST /api/sessions Firestore write error]:', fsErr);
    }

    // Broadcast to mobile & all other devices immediately
    broadcastSessionsUpdate();

    res.json({ success: true, session, total: inMemorySessions.length });
  } catch (err: any) {
    console.error('[API POST /api/sessions error]:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Update session status or items
app.put('/api/sessions/:id', async (req: Request, res: Response) => {
  try {
    const sessionId = req.params.id;
    const updates = req.body;

    const existingIndex = inMemorySessions.findIndex((s) => s.id === sessionId);
    if (existingIndex >= 0) {
      inMemorySessions[existingIndex] = {
        ...inMemorySessions[existingIndex],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
    }

    // Write to Firestore
    try {
      await setDoc(doc(db, 'sessions', sessionId), sanitizeForFirestore(updates), { merge: true });
    } catch (fsErr) {
      console.error('[API PUT /api/sessions/:id Firestore write error]:', fsErr);
    }

    broadcastSessionsUpdate();
    res.json({ success: true });
  } catch (err: any) {
    console.error('[API PUT /api/sessions/:id error]:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Delete a session
app.delete('/api/sessions/:id', async (req: Request, res: Response) => {
  try {
    const sessionId = req.params.id;
    inMemorySessions = inMemorySessions.filter((s) => s.id !== sessionId);

    try {
      await deleteDoc(doc(db, 'sessions', sessionId));
    } catch (fsErr) {
      console.error('[API DELETE /api/sessions/:id Firestore error]:', fsErr);
    }

    broadcastSessionsUpdate();
    res.json({ success: true });
  } catch (err: any) {
    console.error('[API DELETE /api/sessions/:id error]:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Start Server & mount Vite
async function start() {
  await loadInitialDataFromFirestore();

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CEVA Inventory Server listening on http://0.0.0.0:${PORT}`);
  });
}

start();
