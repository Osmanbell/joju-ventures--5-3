import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { initializeApp, getApps } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch
} from "firebase/firestore";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Path to file-based JSON database (used as persistent local cache & fallback)
const DB_DIR = path.join(__dirname, "data");
const DB_PATH = path.join(DB_DIR, "db.json");

// Ensure data directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// Initialize Firebase Firestore from firebase-applet-config.json
const firebaseConfigPath = path.join(__dirname, "firebase-applet-config.json");
let fbApp: any = null;
let firestoreDb: any = null;
let firebaseConfig: any = null;

if (fs.existsSync(firebaseConfigPath)) {
  try {
    firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf-8"));
    fbApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    firestoreDb = getFirestore(fbApp, firebaseConfig.firestoreDatabaseId);
    console.log(`[Firestore] Connected to Firebase Firestore: ${firebaseConfig.firestoreDatabaseId} (${firebaseConfig.projectId})`);
  } catch (err) {
    console.error("[Firestore] Failed to initialize Firebase in server.ts:", err);
  }
}

// Initial/Seed Data helper
function getSeedData() {
  const products = [
    {
      id: "prod-chicken",
      name: "Local Broiler Chicken",
      category: "frozen_foods",
      unit: "kg",
      pricePerUnit: 4500,
      costPerUnit: 3700,
      stockQuantity: 250,
      minStockLevel: 50,
      description: "Organic hand-dressed broiler chicken cuts"
    },
    {
      id: "prod-turkey",
      name: "Premium Imported Turkey",
      category: "frozen_foods",
      unit: "kg",
      pricePerUnit: 5200,
      costPerUnit: 4200,
      stockQuantity: 180,
      minStockLevel: 40,
      description: "Export grade frozen turkey wings and gizzards"
    },
    {
      id: "prod-titus",
      name: "Titus Fish (Mackerel)",
      category: "frozen_foods",
      unit: "kg",
      pricePerUnit: 3800,
      costPerUnit: 3100,
      stockQuantity: 150,
      minStockLevel: 30,
      description: "Sea-fresh iced high-fat mackerel (Titus)"
    },
    {
      id: "prod-panda",
      name: "Panda Fish (Fillet)",
      category: "frozen_foods",
      unit: "kg",
      pricePerUnit: 3200,
      costPerUnit: 2650,
      stockQuantity: 120,
      minStockLevel: 25,
      description: "Premium skinless white fish sections"
    },
    {
      id: "prod-kite",
      name: "Kite Fish",
      category: "frozen_foods",
      unit: "kg",
      pricePerUnit: 3400,
      costPerUnit: 2800,
      stockQuantity: 100,
      minStockLevel: 25,
      description: "Tasty frozen kite fish units"
    },
    {
      id: "prod-croaker",
      name: "Gold Croaker Fish",
      category: "frozen_foods",
      unit: "kg",
      pricePerUnit: 4800,
      costPerUnit: 4000,
      stockQuantity: 90,
      minStockLevel: 20,
      description: "Wild-caught golden croaker fish"
    },
    {
      id: "prod-coke",
      name: "Coca-Cola (Pet)",
      category: "soft_drinks",
      unit: "pcs",
      pricePerUnit: 400,
      costPerUnit: 320,
      stockQuantity: 500,
      minStockLevel: 100,
      description: "Refreshed 35cl Coca-Cola bottles"
    },
    {
      id: "prod-fanta",
      name: "Fanta Orange (Pet)",
      category: "soft_drinks",
      unit: "pcs",
      pricePerUnit: 400,
      costPerUnit: 320,
      stockQuantity: 450,
      minStockLevel: 100,
      description: "Tangy carbonated orange drink"
    },
    {
      id: "prod-pepsi",
      name: "Pepsi Cola",
      category: "soft_drinks",
      unit: "pcs",
      pricePerUnit: 400,
      costPerUnit: 320,
      stockQuantity: 400,
      minStockLevel: 100,
      description: "Ice cold Pepsi Cola pet bottles"
    },
    {
      id: "prod-malt",
      name: "Maltina Can",
      category: "soft_drinks",
      unit: "pcs",
      pricePerUnit: 600,
      costPerUnit: 500,
      stockQuantity: 300,
      minStockLevel: 75,
      description: "Premium rich malt energy beverage"
    },
    {
      id: "prod-water",
      name: "C-Way Table Water",
      category: "soft_drinks",
      unit: "pcs",
      pricePerUnit: 200,
      costPerUnit: 140,
      stockQuantity: 600,
      minStockLevel: 120,
      description: "75cl pure bottle table spring water"
    },
    {
      id: "prod-sachet",
      name: "Pure Sachet Water (Bag)",
      category: "soft_drinks",
      unit: "bag",
      pricePerUnit: 400,
      costPerUnit: 250,
      stockQuantity: 350,
      minStockLevel: 50,
      description: "Standard bundles of 20 purified water sachets"
    },
  ];

  const customers = [
    {
      id: "cust-1",
      name: "Amina Bello",
      phone: "+234 803 123 4567",
      email: "amina.b@gmail.com",
      loyaltyPoints: 450,
      createdAt: "2026-01-10T12:00:00Z",
      notes: "Wholesaler client, purchases chicken on weekly basis",
      purchaseCount: 15,
      totalSpent: 220000
    },
    {
      id: "cust-2",
      name: "Dr. John Okoro",
      phone: "+234 812 987 6543",
      email: "okorojohn@yahoo.com",
      loyaltyPoints: 120,
      createdAt: "2026-02-14T09:30:00Z",
      notes: "Enjoys Titus Fish & Malt drinks for his family clinic events",
      purchaseCount: 4,
      totalSpent: 54000
    },
    {
      id: "cust-3",
      name: "Chioma Nwachukwu",
      phone: "+234 905 555 1122",
      email: "chi.nwachukwu@outlook.com",
      loyaltyPoints: 850,
      createdAt: "2025-11-05T14:20:00Z",
      notes: "Supermarket supplier, monthly bulk order of turkey and sachet bags",
      purchaseCount: 22,
      totalSpent: 420000
    },
    {
      id: "cust-4",
      name: "Abba Yusuf",
      phone: "+234 708 333 4455",
      email: "abba_yusuf@gmail.com",
      loyaltyPoints: 40,
      createdAt: "2026-04-18T16:45:00Z",
      notes: "Walk-in client purchasing soft drinks and small fish bags",
      purchaseCount: 2,
      totalSpent: 18000
    }
  ];

  // Seed standard historic sales split over 2026 and 2025
  const sales = [
    {
      id: "sale-1",
      receiptNo: "REC-2026-001",
      customerId: "cust-1",
      customerName: "Amina Bello",
      items: [
        { productId: "prod-chicken", name: "Local Broiler Chicken", quantity: 20, pricePerUnit: 4500, totalPrice: 90000 },
        { productId: "prod-malt", name: "Maltina Can", quantity: 24, pricePerUnit: 600, totalPrice: 14400 }
      ],
      totalAmount: 104400,
      discountAmount: 4400,
      netAmount: 100000,
      pointsEarned: 100,
      pointsRedeemed: 0,
      date: "2026-03-05",
      month: "2026-03",
      year: 2026,
      paymentMethod: "transfer",
      printedRef: true
    },
    {
      id: "sale-2",
      receiptNo: "REC-2026-002",
      customerId: "cust-3",
      customerName: "Chioma Nwachukwu",
      items: [
        { productId: "prod-turkey", name: "Premium Imported Turkey", quantity: 25, pricePerUnit: 5200, totalPrice: 130000 },
        { productId: "prod-sachet", name: "Pure Sachet Water (Bag)", quantity: 50, pricePerUnit: 400, totalPrice: 20000 }
      ],
      totalAmount: 150000,
      discountAmount: 5000,
      netAmount: 145000,
      pointsEarned: 145,
      pointsRedeemed: 0,
      date: "2026-04-10",
      month: "2026-04",
      year: 2026,
      paymentMethod: "pos",
      printedRef: true
    },
    {
      id: "sale-3",
      receiptNo: "REC-2026-003",
      customerId: "cust-2",
      customerName: "Dr. John Okoro",
      items: [
        { productId: "prod-titus", name: "Titus Fish (Mackerel)", quantity: 10, pricePerUnit: 3800, totalPrice: 38000 },
        { productId: "prod-water", name: "C-Way Table Water", quantity: 12, pricePerUnit: 200, totalPrice: 2400 }
      ],
      totalAmount: 40400,
      discountAmount: 400,
      netAmount: 40000,
      pointsEarned: 40,
      pointsRedeemed: 0,
      date: "2026-04-20",
      month: "2026-04",
      year: 2026,
      paymentMethod: "cash",
      printedRef: false
    },
    {
      id: "sale-4",
      receiptNo: "REC-2026-004",
      customerId: "cust-3",
      customerName: "Chioma Nwachukwu",
      items: [
        { productId: "prod-croaker", name: "Gold Croaker Fish", quantity: 8, pricePerUnit: 4800, totalPrice: 38400 },
        { productId: "prod-coke", name: "Coca-Cola (Pet)", quantity: 24, pricePerUnit: 400, totalPrice: 9600 }
      ],
      totalAmount: 48000,
      discountAmount: 0,
      netAmount: 48000,
      pointsEarned: 48,
      pointsRedeemed: 0,
      date: "2026-05-02",
      month: "2026-05",
      year: 2026,
      paymentMethod: "transfer",
      printedRef: true
    },
    {
      id: "sale-5",
      receiptNo: "REC-2026-005",
      customerId: "cust-1",
      customerName: "Amina Bello",
      items: [
        { productId: "prod-chicken", name: "Local Broiler Chicken", quantity: 12, pricePerUnit: 4500, totalPrice: 54000 }
      ],
      totalAmount: 54000,
      discountAmount: 2000,
      netAmount: 52000,
      pointsEarned: 52,
      pointsRedeemed: 50,
      date: "2026-05-15",
      month: "2026-05",
      year: 2026,
      paymentMethod: "cash",
      printedRef: true
    },
    {
      id: "sale-6",
      receiptNo: "REC-2026-006",
      customerId: "cust-4",
      customerName: "Abba Yusuf",
      items: [
        { productId: "prod-water", name: "C-Way Table Water", quantity: 48, pricePerUnit: 200, totalPrice: 9600 },
        { productId: "prod-pepsi", name: "Pepsi Cola", quantity: 12, pricePerUnit: 400, totalPrice: 4800 }
      ],
      totalAmount: 14400,
      discountAmount: 400,
      netAmount: 14000,
      pointsEarned: 14,
      pointsRedeemed: 0,
      date: "2026-05-28",
      month: "2026-05",
      year: 2026,
      paymentMethod: "pos",
      printedRef: false
    },
    {
      id: "sale-7",
      receiptNo: "REC-2025-001",
      customerId: "cust-3",
      customerName: "Chioma Nwachukwu",
      items: [
        { productId: "prod-chicken", name: "Local Broiler Chicken", quantity: 30, pricePerUnit: 4400, totalPrice: 132000 },
        { productId: "prod-fanta", name: "Fanta Orange (Pet)", quantity: 36, pricePerUnit: 380, totalPrice: 13680 }
      ],
      totalAmount: 145680,
      discountAmount: 5680,
      netAmount: 140000,
      pointsEarned: 140,
      pointsRedeemed: 0,
      date: "2025-11-20",
      month: "2025-11",
      year: 2025,
      paymentMethod: "transfer",
      printedRef: true
    },
    {
      id: "sale-8",
      receiptNo: "REC-2025-002",
      customerId: "cust-1",
      customerName: "Amina Bello",
      items: [
        { productId: "prod-croaker", name: "Gold Croaker Fish", quantity: 15, pricePerUnit: 4600, totalPrice: 69000 }
      ],
      totalAmount: 69000,
      discountAmount: 1000,
      netAmount: 68000,
      pointsEarned: 68,
      pointsRedeemed: 0,
      date: "2025-12-15",
      month: "2025-12",
      year: 2025,
      paymentMethod: "transfer",
      printedRef: true
    }
  ];

  const attendants = [
    { id: "att-1", name: "Fatima Abubakar", password: "123", role: "attendant" },
    { id: "att-2", name: "Aminu Ibrahim", password: "123", role: "attendant" },
    { id: "att-3", name: "Yusuf Haruna", password: "123", role: "attendant" },
    { id: "att-4", name: "Mariya Dauda", password: "123", role: "attendant" }
  ];

  return { products, customers, sales, attendants };
}

// Database Read/Write Utilities (used as persistent local cache & fallback)
function readDB() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      const seed = getSeedData();
      writeDB(seed);
      return seed;
    }
    const raw = fs.readFileSync(DB_PATH, "utf-8");
    if (!raw || !raw.trim()) {
      const seed = getSeedData();
      writeDB(seed);
      return seed;
    }
    const parsed = JSON.parse(raw);
    
    if (!parsed.products || !Array.isArray(parsed.products) || parsed.products.length === 0) {
      parsed.products = getSeedData().products;
    }
    if (!parsed.customers || !Array.isArray(parsed.customers)) parsed.customers = [];
    if (!parsed.sales || !Array.isArray(parsed.sales)) parsed.sales = [];
    if (!parsed.attendants || !Array.isArray(parsed.attendants) || parsed.attendants.length === 0) {
      parsed.attendants = getSeedData().attendants;
    }
    return parsed;
  } catch (error) {
    console.error("Corrupted database file detected. Auto-healing with seed data:", error);
    const seed = getSeedData();
    writeDB(seed);
    return seed;
  }
}

function writeDB(data: any) {
  try {
    const tmpPath = `${DB_PATH}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), "utf-8");
    fs.renameSync(tmpPath, DB_PATH);
    return true;
  } catch (error) {
    try {
      fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
      return true;
    } catch (err2) {
      console.error("Fatal error writing database file:", err2);
      return false;
    }
  }
}

// Firestore Async Helpers with Local DB Fallback
async function seedFirestoreIfEmpty() {
  if (!firestoreDb) return;
  try {
    const snap = await getDocs(collection(firestoreDb, "products"));
    if (snap.empty) {
      console.log("[Firestore] Seeding initial database catalog to Firestore...");
      const seed = getSeedData();
      const batch = writeBatch(firestoreDb);

      for (const prod of seed.products) {
        batch.set(doc(firestoreDb, "products", prod.id), prod);
      }
      for (const cust of seed.customers) {
        batch.set(doc(firestoreDb, "customers", cust.id), cust);
      }
      for (const att of seed.attendants) {
        batch.set(doc(firestoreDb, "attendants", att.id), att);
      }
      for (const s of seed.sales) {
        batch.set(doc(firestoreDb, "sales", s.id), s);
      }

      await batch.commit();
      console.log("[Firestore] Successfully seeded Firestore database!");
    } else {
      // Clean up legacy placeholder photos from Firestore if any exist
      const cleanupBatch = writeBatch(firestoreDb);
      let hasLegacy = false;
      snap.forEach((d) => {
        const data = d.data();
        if (data.imageUrl && data.imageUrl.includes("unsplash.com")) {
          cleanupBatch.update(doc(firestoreDb, "products", d.id), { imageUrl: "" });
          hasLegacy = true;
        }
      });
      if (hasLegacy) {
        await cleanupBatch.commit();
        console.log("[Firestore] Cleaned up legacy placeholder stock photos from Firestore!");
      }
    }
  } catch (err) {
    console.error("[Firestore] Seeding check failed:", err);
  }
}

async function getProductsData(): Promise<any[]> {
  if (firestoreDb) {
    try {
      const snap = await getDocs(collection(firestoreDb, "products"));
      if (!snap.empty) {
        const list: any[] = [];
        snap.forEach((d) => {
          const item = d.data();
          if (item.imageUrl && item.imageUrl.includes("unsplash.com")) {
            item.imageUrl = "";
          }
          list.push(item);
        });
        return list;
      }
    } catch (e) {
      console.error("[Firestore] Products read error:", e);
    }
  }
  return readDB().products;
}

async function getCustomersData(): Promise<any[]> {
  if (firestoreDb) {
    try {
      const snap = await getDocs(collection(firestoreDb, "customers"));
      if (!snap.empty) {
        const list: any[] = [];
        snap.forEach((d) => list.push(d.data()));
        return list;
      }
    } catch (e) {
      console.error("[Firestore] Customers read error:", e);
    }
  }
  return readDB().customers;
}

async function getSalesData(): Promise<any[]> {
  if (firestoreDb) {
    try {
      const snap = await getDocs(collection(firestoreDb, "sales"));
      if (!snap.empty) {
        const list: any[] = [];
        snap.forEach((d) => list.push(d.data()));
        list.sort((a, b) => (b.date > a.date ? 1 : -1));
        return list;
      }
    } catch (e) {
      console.error("[Firestore] Sales read error:", e);
    }
  }
  return readDB().sales;
}

async function getAttendantsData(): Promise<any[]> {
  if (firestoreDb) {
    try {
      const snap = await getDocs(collection(firestoreDb, "attendants"));
      if (!snap.empty) {
        const list: any[] = [];
        snap.forEach((d) => list.push(d.data()));
        return list;
      }
    } catch (e) {
      console.error("[Firestore] Attendants read error:", e);
    }
  }
  return readDB().attendants;
}

// Database Status API
app.get("/api/db-status", (req, res) => {
  res.json({
    connected: !!firestoreDb,
    engine: "Firebase Firestore",
    databaseId: firebaseConfig?.firestoreDatabaseId || "ai-studio-jojuventures-f356a561-1a50-49db-9d39-c17ab681f7d2",
    projectId: firebaseConfig?.projectId || "centered-anchor-8jkjx",
    status: firestoreDb ? "online" : "connecting"
  });
});

// Products API
app.get("/api/products", async (req, res) => {
  const products = await getProductsData();
  res.json(products);
});

app.post("/api/products", async (req, res) => {
  const newItem = {
    id: `prod-${Date.now()}`,
    name: req.body.name,
    category: req.body.category,
    unit: req.body.unit,
    pricePerUnit: Number(req.body.pricePerUnit) || 0,
    costPerUnit: Number(req.body.costPerUnit) || 0,
    stockQuantity: Number(req.body.stockQuantity) || 0,
    minStockLevel: Number(req.body.minStockLevel) || 10,
    description: req.body.description || "",
    imageUrl: req.body.imageUrl || ""
  };

  if (firestoreDb) {
    try {
      await setDoc(doc(firestoreDb, "products", newItem.id), newItem);
    } catch (err) {
      console.error("[Firestore] Error writing product:", err);
    }
  }

  const db = readDB();
  db.products.push(newItem);
  writeDB(db);

  res.status(201).json(newItem);
});

app.put("/api/products/:id", async (req, res) => {
  const id = req.params.id;
  const updates: any = {};
  if (req.body.name !== undefined) updates.name = req.body.name;
  if (req.body.category !== undefined) updates.category = req.body.category;
  if (req.body.unit !== undefined) updates.unit = req.body.unit;
  if (req.body.pricePerUnit !== undefined) updates.pricePerUnit = Number(req.body.pricePerUnit);
  if (req.body.costPerUnit !== undefined) updates.costPerUnit = Number(req.body.costPerUnit);
  if (req.body.stockQuantity !== undefined) updates.stockQuantity = Number(req.body.stockQuantity);
  if (req.body.minStockLevel !== undefined) updates.minStockLevel = Number(req.body.minStockLevel);
  if (req.body.description !== undefined) updates.description = req.body.description;
  if (req.body.imageUrl !== undefined) updates.imageUrl = req.body.imageUrl;

  if (firestoreDb) {
    try {
      await updateDoc(doc(firestoreDb, "products", id), updates);
    } catch (err) {
      console.error("[Firestore] Error updating product:", err);
    }
  }

  const db = readDB();
  const index = db.products.findIndex((p: any) => p.id === id);
  if (index !== -1) {
    db.products[index] = { ...db.products[index], ...updates };
    writeDB(db);
    res.json(db.products[index]);
  } else {
    res.json({ id, ...updates });
  }
});

app.delete("/api/products/:id", async (req, res) => {
  const id = req.params.id;
  if (firestoreDb) {
    try {
      await deleteDoc(doc(firestoreDb, "products", id));
    } catch (err) {
      console.error("[Firestore] Error deleting product:", err);
    }
  }

  const db = readDB();
  db.products = db.products.filter((p: any) => p.id !== id);
  writeDB(db);
  res.json({ success: true });
});

// Customers API
app.get("/api/customers", async (req, res) => {
  const customers = await getCustomersData();
  res.json(customers);
});

app.post("/api/customers", async (req, res) => {
  const newCustomer = {
    id: `cust-${Date.now()}`,
    name: req.body.name,
    phone: req.body.phone || "",
    email: req.body.email || "",
    loyaltyPoints: Number(req.body.loyaltyPoints) || 0,
    createdAt: new Date().toISOString(),
    notes: req.body.notes || "",
    purchaseCount: 0,
    totalSpent: 0
  };

  if (firestoreDb) {
    try {
      await setDoc(doc(firestoreDb, "customers", newCustomer.id), newCustomer);
    } catch (err) {
      console.error("[Firestore] Error writing customer:", err);
    }
  }

  const db = readDB();
  db.customers.push(newCustomer);
  writeDB(db);
  res.status(201).json(newCustomer);
});

app.put("/api/customers/:id", async (req, res) => {
  const id = req.params.id;
  const updates: any = {};
  if (req.body.name !== undefined) updates.name = req.body.name;
  if (req.body.phone !== undefined) updates.phone = req.body.phone;
  if (req.body.email !== undefined) updates.email = req.body.email;
  if (req.body.notes !== undefined) updates.notes = req.body.notes;
  if (req.body.loyaltyPoints !== undefined) updates.loyaltyPoints = Number(req.body.loyaltyPoints);

  if (firestoreDb) {
    try {
      await updateDoc(doc(firestoreDb, "customers", id), updates);
    } catch (err) {
      console.error("[Firestore] Error updating customer:", err);
    }
  }

  const db = readDB();
  const index = db.customers.findIndex((c: any) => c.id === id);
  if (index !== -1) {
    db.customers[index] = { ...db.customers[index], ...updates };
    writeDB(db);
    res.json(db.customers[index]);
  } else {
    res.json({ id, ...updates });
  }
});

app.delete("/api/customers/:id", async (req, res) => {
  const id = req.params.id;
  if (firestoreDb) {
    try {
      await deleteDoc(doc(firestoreDb, "customers", id));
    } catch (err) {
      console.error("[Firestore] Error deleting customer:", err);
    }
  }

  const db = readDB();
  db.customers = db.customers.filter((c: any) => c.id !== id);
  writeDB(db);
  res.json({ success: true });
});

// Attendants API
app.get("/api/attendants", async (req, res) => {
  const attendants = await getAttendantsData();
  res.json(attendants);
});

app.post("/api/attendants", async (req, res) => {
  const { name, password, role } = req.body;
  if (!name || !password) {
    return res.status(400).json({ error: "Name and password are required" });
  }

  const currentAttendants = await getAttendantsData();
  const exists = currentAttendants.find((a: any) => a.name.toLowerCase() === name.toLowerCase());
  if (exists) {
    return res.status(400).json({ error: "An attendant with this name already exists" });
  }

  const newAttendant = {
    id: `att-${Date.now()}`,
    name,
    password,
    role: role === 'manager' ? 'manager' : 'attendant'
  };

  if (firestoreDb) {
    try {
      await setDoc(doc(firestoreDb, "attendants", newAttendant.id), newAttendant);
    } catch (err) {
      console.error("[Firestore] Error writing attendant:", err);
    }
  }

  const db = readDB();
  db.attendants.push(newAttendant);
  writeDB(db);
  res.status(201).json(newAttendant);
});

app.put("/api/attendants/:id", async (req, res) => {
  const id = req.params.id;
  const updates: any = {};
  if (req.body.name !== undefined) updates.name = req.body.name;
  if (req.body.password !== undefined) updates.password = req.body.password;
  if (req.body.role !== undefined) updates.role = req.body.role === 'manager' ? 'manager' : 'attendant';

  if (firestoreDb) {
    try {
      await updateDoc(doc(firestoreDb, "attendants", id), updates);
    } catch (err) {
      console.error("[Firestore] Error updating attendant:", err);
    }
  }

  const db = readDB();
  const index = db.attendants.findIndex((a: any) => a.id === id);
  if (index !== -1) {
    db.attendants[index] = { ...db.attendants[index], ...updates };
    writeDB(db);
    res.json(db.attendants[index]);
  } else {
    res.json({ id, ...updates });
  }
});

app.delete("/api/attendants/:id", async (req, res) => {
  const id = req.params.id;
  if (firestoreDb) {
    try {
      await deleteDoc(doc(firestoreDb, "attendants", id));
    } catch (err) {
      console.error("[Firestore] Error deleting attendant:", err);
    }
  }

  const db = readDB();
  db.attendants = db.attendants.filter((a: any) => a.id !== id);
  writeDB(db);
  res.json({ success: true });
});

// Settings & Security Configuration API
app.get("/api/settings", async (req, res) => {
  let managerPassword = "1234";
  if (firestoreDb) {
    try {
      const snap = await getDoc(doc(firestoreDb, "settings", "store_config"));
      if (snap.exists() && snap.data()?.managerPassword) {
        managerPassword = snap.data().managerPassword;
      }
    } catch (e) {
      console.warn("[Firestore] Could not fetch settings:", e);
    }
  } else {
    const db = readDB();
    if (db.settings?.managerPassword) {
      managerPassword = db.settings.managerPassword;
    }
  }
  res.json({ managerPassword });
});

app.post("/api/settings/manager-password", async (req, res) => {
  const { password } = req.body;
  if (!password || typeof password !== "string" || !password.trim()) {
    return res.status(400).json({ error: "Password cannot be empty" });
  }

  const cleanPass = password.trim();
  if (firestoreDb) {
    try {
      await setDoc(doc(firestoreDb, "settings", "store_config"), { managerPassword: cleanPass }, { merge: true });
    } catch (e) {
      console.error("[Firestore] Failed to update manager password:", e);
    }
  }

  const db = readDB();
  if (!db.settings) db.settings = {};
  db.settings.managerPassword = cleanPass;
  writeDB(db);

  res.json({ success: true, managerPassword: cleanPass });
});

// Sales & Checkout API
app.get("/api/sales", async (req, res) => {
  const sales = await getSalesData();
  res.json(sales);
});

app.post("/api/sales", async (req, res) => {
  const { customerId, customerName, items, totalAmount, discountAmount, netAmount, pointsRedeemed, paymentMethod, cashier } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ error: "Cart can't be empty" });
  }

  const currentProducts = await getProductsData();
  const currentCustomers = await getCustomersData();

  // Generate unique receipt number
  const today = new Date();
  const year = today.getFullYear();
  const monthStr = String(today.getMonth() + 1).padStart(2, "0");
  const dayStr = String(today.getDate()).padStart(2, "0");
  const dateStr = `${year}-${monthStr}-${dayStr}`;
  const monthKey = `${year}-${monthStr}`;

  const currentSales = await getSalesData();
  const dayReceiptCount = currentSales.filter((s: any) => s.date === dateStr).length + 1;
  const receiptNo = `REC-${year}${monthStr}${dayStr}-${String(dayReceiptCount).padStart(3, "0")}`;

  // Deduct stock for products and verify availability
  for (const item of items) {
    const product = currentProducts.find((p: any) => p.id === item.productId);
    if (!product) {
      return res.status(400).json({ error: `Product ${item.name} not found` });
    }
    if (product.stockQuantity < item.quantity) {
      return res.status(400).json({ error: `Insufficient stock for ${product.name}. Available: ${product.stockQuantity} ${product.unit}` });
    }
    product.stockQuantity -= item.quantity;
  }

  // Calculate Loyalty details (1 point for every 1000 Naira spent)
  const earnedAmt = Number(netAmount) || 0;
  const pointsEarned = Math.floor(earnedAmt / 1000);

  let updatedCustomer: any = null;
  if (customerId) {
    const customer = currentCustomers.find((c: any) => c.id === customerId);
    if (customer) {
      customer.purchaseCount = (customer.purchaseCount || 0) + 1;
      customer.totalSpent = (customer.totalSpent || 0) + earnedAmt;
      customer.loyaltyPoints = Math.max(0, (customer.loyaltyPoints || 0) + pointsEarned - (Number(pointsRedeemed) || 0));
      
      if (!customer.purchasedItems) {
        customer.purchasedItems = [];
      }
      items.forEach((itm: any) => {
        customer.purchasedItems.push({
          productId: itm.productId,
          name: itm.name,
          quantity: Number(itm.quantity),
          pricePerUnit: Number(itm.pricePerUnit),
          totalPrice: Number(itm.totalPrice),
          date: dateStr,
          receiptNo
        });
      });
      updatedCustomer = customer;
    }
  }

  // Create new Sale Record
  const newSale = {
    id: `sale-${Date.now()}`,
    receiptNo,
    customerId: customerId || null,
    customerName: customerName || "Anonymous Buyer",
    items,
    totalAmount: Number(totalAmount),
    discountAmount: Number(discountAmount) || 0,
    netAmount: earnedAmt,
    pointsEarned,
    pointsRedeemed: Number(pointsRedeemed) || 0,
    date: dateStr,
    month: monthKey,
    year,
    paymentMethod: paymentMethod || "cash",
    printedRef: false,
    cashier: cashier || "General Cashier"
  };

  // Persist to Firebase Firestore atomically
  if (firestoreDb) {
    try {
      const batch = writeBatch(firestoreDb);
      batch.set(doc(firestoreDb, "sales", newSale.id), newSale);

      for (const item of items) {
        const prod = currentProducts.find((p: any) => p.id === item.productId);
        if (prod) {
          batch.update(doc(firestoreDb, "products", prod.id), {
            stockQuantity: prod.stockQuantity
          });
        }
      }

      if (customerId && updatedCustomer) {
        batch.update(doc(firestoreDb, "customers", customerId), {
          purchaseCount: updatedCustomer.purchaseCount,
          totalSpent: updatedCustomer.totalSpent,
          loyaltyPoints: updatedCustomer.loyaltyPoints,
          purchasedItems: (updatedCustomer.purchasedItems || []).slice(0, 50)
        });
      }

      await batch.commit();
    } catch (err) {
      console.error("[Firestore] Error committing sale batch:", err);
    }
  }

  // Also sync to local DB cache
  const db = readDB();
  db.products = currentProducts;
  if (updatedCustomer) {
    const cIdx = db.customers.findIndex((c: any) => c.id === customerId);
    if (cIdx !== -1) db.customers[cIdx] = updatedCustomer;
  }
  db.sales.unshift(newSale);
  writeDB(db);

  res.status(201).json({ sale: newSale, products: currentProducts, customers: currentCustomers });
});

// Analytics & Reports API
app.get("/api/reports", async (req, res) => {
  const sales = await getSalesData();
  const products = await getProductsData();
  const customers = await getCustomersData();

  // Let's compute product-level profit margins and sales volumes
  const productStats: Record<string, { name: string; category: string; quantitySold: number; revenue: number; cost: number; profit: number }> = {};
  
  // Initialize productStats
  products.forEach((p: any) => {
    productStats[p.id] = {
      name: p.name,
      category: p.category,
      quantitySold: 0,
      revenue: 0,
      cost: 0,
      profit: 0
    };
  });

  let totalExpenses = 0;
  let totalRevenue = 0;
  let totalCostOfGoods = 0;

  sales.forEach((s: any) => {
    totalRevenue += s.netAmount;
    s.items.forEach((item: any) => {
      const product = products.find((p: any) => p.id === item.productId);
      const costPerUnit = product ? product.costPerUnit : item.pricePerUnit * 0.8;
      const totalCost = costPerUnit * item.quantity;
      totalCostOfGoods += totalCost;

      if (!productStats[item.productId]) {
        productStats[item.productId] = {
          name: item.name,
          category: product ? product.category : "unknown",
          quantitySold: 0,
          revenue: 0,
          cost: 0,
          profit: 0
        };
      }
      productStats[item.productId].quantitySold += item.quantity;
      productStats[item.productId].revenue += item.totalPrice;
      productStats[item.productId].cost += totalCost;
      productStats[item.productId].profit += (item.totalPrice - totalCost);
    });
  });

  const topProducts = Object.values(productStats)
    .filter((p: any) => p.quantitySold > 0)
    .sort((a: any, b: any) => b.revenue - a.revenue);

  // Group by months for historic chart
  const monthlyLogs: Record<string, { month: string; revenue: number; cost: number; profit: number; count: number }> = {};
  
  sales.forEach((s: any) => {
    const m = s.month; // YYYY-MM
    if (!monthlyLogs[m]) {
      monthlyLogs[m] = { month: m, revenue: 0, cost: 0, profit: 0, count: 0 };
    }
    
    monthlyLogs[m].revenue += s.netAmount;
    monthlyLogs[m].count += 1;
    
    let estimatedCost = 0;
    s.items.forEach((item: any) => {
      const prod = products.find((p: any) => p.id === item.productId);
      const cpu = prod ? prod.costPerUnit : item.pricePerUnit * 0.8;
      estimatedCost += cpu * item.quantity;
    });
    monthlyLogs[m].cost += estimatedCost;
    monthlyLogs[m].profit += (s.netAmount - estimatedCost);
  });

  const financialHistory = Object.values(monthlyLogs).sort((a, b) => a.month.localeCompare(b.month));

  res.json({
    summary: {
      totalRevenue,
      totalCostOfGoods,
      totalProfit: totalRevenue - totalCostOfGoods,
      totalSalesCount: sales.length,
      totalCustomersCount: customers.length
    },
    topProducts,
    financialHistory
  });
});

// Server-Side Gemini API Copilot
app.post("/api/ai/audit", async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  const products = await getProductsData();
  const customers = await getCustomersData();
  const sales = await getSalesData();
  const { prompt, type } = req.body;

  if (!apiKey) {
    // Elegant recovery fallback when key is not loaded
    return res.json({
      response: `## ⚠️ Sandbox/Offline Mode is Active

The system is currently running in offline audit mode because a Gemini API key is not configured in this workspace environment. 

### Simulated Quick Audit Recommendations:
1. **Inventory Discrepancy Control**:
   - High-cost products such as **${products[1]?.name || 'Imported Turkey'}** have active demands. Setup stock notifications when inventory drops below ${products[1]?.minStockLevel || 40} kg.
   - Sachet water and soft drinks move quickly but offer lower overall margins. Focus on bundled marketing (e.g. "Buy 10kg Titus Fish, Get a pack of Coke at 10% off").
   
2. **Loyalty & Customer Rewards Strategy**:
   - **${customers[2]?.name || 'Chioma Nwachukwu'}** (Points: **${customers[2]?.loyaltyPoints || 850}**) is currently your highest-spending partner. Consider awarding a **Bronze Wholesale Loyalty rebate** on her next Turkey pallet purchase.
   - **${customers[0]?.name || 'Amina Bello'}** (Points: **${customers[0]?.loyaltyPoints || 450}**) is highly consistent. Send automated text reminders or provide free Spring Water crates with purchases > 50kg.

*Note: Database: **Google Cloud Firebase Firestore (centered-anchor-8jkjx)**. Paste your **GEMINI_API_KEY** into the Secrets panel in AI Studio Settings to unlock full customized stock forecasts and AI business analysis.*`
    });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    // Extract core inventory & customer files to append as context
    const productsExcerpt = products.map((p: any) => ({
      name: p.name,
      category: p.category,
      stock: p.stockQuantity,
      price: p.pricePerUnit,
      cost: p.costPerUnit,
      minStock: p.minStockLevel
    }));

    const customersExcerpt = customers.map((c: any) => ({
      name: c.name,
      points: c.loyaltyPoints,
      purchaseCount: c.purchaseCount,
      totalSpent: c.totalSpent,
      notes: c.notes
    }));

    const recentSalesExcerpt = sales.slice(0, 10).map((s: any) => ({
      receipt: s.receiptNo,
      customer: s.customerName,
      net: s.netAmount,
      date: s.date,
      items: s.items.map((i: any) => `${i.name} (${i.quantity}x)`)
    }));

    const systemPrompt = `You are the Lead Financial Auditor & Operational AI Intelligence Copilot for "Frozen Foods and Drinks Hub" (a retail business specializing in frozen chicken, turkey, fishes like Titus, Panda, Kite, and soft drinks like Coke, Pepsi, Malt, Fanta, water).
Using the store's backend databases, analyze, audit, and answer the user query clearly. Frame your answers with structural headings, professional layout, bullet points, and exact metric references.

Current Business Catalog State:
${JSON.stringify(productsExcerpt, null, 2)}

Active Client Directory:
${JSON.stringify(customersExcerpt, null, 2)}

Recent Sales Log Book (Last 10):
${JSON.stringify(recentSalesExcerpt, null, 2)}

Provide actionable, exact, professional financial formulas and feedback. Format exclusively in Markdown without code blocks wrapping the output if possible, keep it tidy. Ensure numbers are listed in standard currency formatting (use standard Naira symbols ₦ or general commas).`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt || "Give me a complete operational audit, potential inventory flags, and a list of customer reward ideas for my frozen food store.",
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7,
      },
    });

    res.json({ response: response.text });
  } catch (err: any) {
    console.error("Gemini API server failure:", err);
    res.status(500).json({ error: "Gemini server process failed to evaluate response.", details: err.message });
  }
});

// Configure Vite middleware in development or static dist in production
const startServer = async () => {
  // Ensure initial Firestore seed
  await seedFirestoreIfEmpty();

  const isProd = process.env.NODE_ENV === "production";
  const distPath = path.join(process.cwd(), "dist");
  const hasDist = fs.existsSync(distPath) && fs.existsSync(path.join(distPath, "index.html"));

  if (isProd && hasDist) {
    app.use(express.static(distPath));
    // SPA fallback
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express server running on http://localhost:${PORT}`);
  });
};

startServer();
