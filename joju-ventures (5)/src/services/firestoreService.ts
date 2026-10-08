import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  query,
  orderBy
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { Product, Customer, Sale, Attendant } from "../types";

// Seed Data for initial store catalog if Firestore is empty
const INITIAL_PRODUCTS: Product[] = [
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
    name: "Kite Fish (Headless)",
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
  }
];

const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: "cust-1",
    name: "Amina Bello",
    phone: "+234 803 123 4567",
    email: "amina.bello@gmail.com",
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

const INITIAL_ATTENDANTS: Attendant[] = [
  { id: "att-1", name: "Fatima Abubakar", password: "123", role: "attendant" },
  { id: "att-2", name: "Aminu Ibrahim", password: "123", role: "attendant" },
  { id: "att-3", name: "Yusuf Haruna", password: "123", role: "attendant" },
  { id: "att-4", name: "Mariya Dauda", password: "123", role: "attendant" }
];

const INITIAL_SALES: Sale[] = [
  {
    id: "sale-1",
    receiptNo: "REC-20260305-001",
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
    printedRef: true,
    cashier: "Fatima Abubakar"
  },
  {
    id: "sale-2",
    receiptNo: "REC-20260410-002",
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
    printedRef: true,
    cashier: "Aminu Ibrahim"
  }
];

// Helper to seed Firestore if empty & clean legacy default stock photos
let isSeeding = false;
export async function seedFirestoreIfEmpty() {
  if (isSeeding) return;
  try {
    const productsSnap = await getDocs(collection(db, "products"));
    if (productsSnap.empty) {
      isSeeding = true;
      console.log("Seeding initial store data to Firebase Firestore...");
      const batch = writeBatch(db);

      INITIAL_PRODUCTS.forEach((prod) => {
        batch.set(doc(db, "products", prod.id), prod);
      });

      INITIAL_CUSTOMERS.forEach((cust) => {
        batch.set(doc(db, "customers", cust.id), cust);
      });

      INITIAL_ATTENDANTS.forEach((att) => {
        batch.set(doc(db, "attendants", att.id), att);
      });

      INITIAL_SALES.forEach((s) => {
        batch.set(doc(db, "sales", s.id), s);
      });

      await batch.commit();
      console.log("Firestore successfully seeded with catalog, customers, and staff!");
    } else {
      // Clean up any legacy default stock photos from Firestore
      const updateBatch = writeBatch(db);
      let needsCleanup = false;
      productsSnap.forEach((d) => {
        const p = d.data() as Product;
        if (p.imageUrl && p.imageUrl.includes("unsplash.com")) {
          updateBatch.update(doc(db, "products", d.id), { imageUrl: "" });
          needsCleanup = true;
        }
      });
      if (needsCleanup) {
        await updateBatch.commit();
        console.log("Cleaned up legacy default stock photos from Firestore.");
      }
    }
  } catch (error) {
    console.error("Error during initial Firestore seed check:", error);
  } finally {
    isSeeding = false;
  }
}

// Real-time Subscriptions with error handling
export function subscribeToProducts(
  onData: (products: Product[]) => void,
  onError?: (err: Error) => void
) {
  const path = "products";
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const prods: Product[] = [];
      snapshot.forEach((d) => {
        prods.push(d.data() as Product);
      });
      onData(prods);
    },
    (err) => {
      if (onError) onError(err);
      handleFirestoreError(err, OperationType.LIST, path);
    }
  );
}

export function subscribeToCustomers(
  onData: (customers: Customer[]) => void,
  onError?: (err: Error) => void
) {
  const path = "customers";
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const custs: Customer[] = [];
      snapshot.forEach((d) => {
        custs.push(d.data() as Customer);
      });
      onData(custs);
    },
    (err) => {
      if (onError) onError(err);
      handleFirestoreError(err, OperationType.LIST, path);
    }
  );
}

export function subscribeToSales(
  onData: (sales: Sale[]) => void,
  onError?: (err: Error) => void
) {
  const path = "sales";
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const sList: Sale[] = [];
      snapshot.forEach((d) => {
        sList.push(d.data() as Sale);
      });
      // Sort newest date first
      sList.sort((a, b) => (b.date > a.date ? 1 : -1));
      onData(sList);
    },
    (err) => {
      if (onError) onError(err);
      handleFirestoreError(err, OperationType.LIST, path);
    }
  );
}

export function subscribeToAttendants(
  onData: (attendants: Attendant[]) => void,
  onError?: (err: Error) => void
) {
  const path = "attendants";
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const atts: Attendant[] = [];
      snapshot.forEach((d) => {
        atts.push(d.data() as Attendant);
      });
      onData(atts);
    },
    (err) => {
      if (onError) onError(err);
      handleFirestoreError(err, OperationType.LIST, path);
    }
  );
}

// Product Operations
export async function createProductInFirestore(productData: Omit<Product, "id">): Promise<Product> {
  const path = "products";
  try {
    const id = `prod-${Date.now()}`;
    const newProd: Product = { ...productData, id };
    await setDoc(doc(db, path, id), newProd);
    return newProd;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function updateProductInFirestore(id: string, productData: Partial<Product>): Promise<void> {
  const path = `products/${id}`;
  try {
    await updateDoc(doc(db, "products", id), productData);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteProductInFirestore(id: string): Promise<void> {
  const path = `products/${id}`;
  try {
    await deleteDoc(doc(db, "products", id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// Customer Operations
export async function createCustomerInFirestore(customerData: Omit<Customer, "id">): Promise<Customer> {
  const path = "customers";
  try {
    const id = `cust-${Date.now()}`;
    const newCust: Customer = {
      ...customerData,
      id,
      createdAt: new Date().toISOString(),
      purchaseCount: 0,
      totalSpent: 0
    };
    await setDoc(doc(db, path, id), newCust);
    return newCust;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function updateCustomerInFirestore(id: string, customerData: Partial<Customer>): Promise<void> {
  const path = `customers/${id}`;
  try {
    await updateDoc(doc(db, "customers", id), customerData);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteCustomerInFirestore(id: string): Promise<void> {
  const path = `customers/${id}`;
  try {
    await deleteDoc(doc(db, "customers", id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// Attendant Operations
export async function createAttendantInFirestore(attendantData: Omit<Attendant, "id">): Promise<Attendant> {
  const path = "attendants";
  try {
    const id = `att-${Date.now()}`;
    const newAtt: Attendant = { ...attendantData, id };
    await setDoc(doc(db, path, id), newAtt);
    return newAtt;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function updateAttendantInFirestore(id: string, attendantData: Partial<Attendant>): Promise<void> {
  const path = `attendants/${id}`;
  try {
    await updateDoc(doc(db, "attendants", id), attendantData);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteAttendantInFirestore(id: string): Promise<void> {
  const path = `attendants/${id}`;
  try {
    await deleteDoc(doc(db, "attendants", id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// Sales Checkout with Atomic Stock Deduction and Customer Loyalty Update
export async function recordSaleInFirestore(
  salePayload: {
    customerId: string | null;
    customerName: string;
    items: { productId: string; name: string; quantity: number; pricePerUnit: number; totalPrice: number }[];
    totalAmount: number;
    discountAmount: number;
    netAmount: number;
    pointsRedeemed: number;
    paymentMethod: "cash" | "pos" | "transfer";
    cashier?: string;
  },
  currentProducts: Product[],
  currentCustomer?: Customer | null
): Promise<Sale> {
  const path = "sales";
  try {
    const today = new Date();
    const year = today.getFullYear();
    const monthStr = String(today.getMonth() + 1).padStart(2, "0");
    const dayStr = String(today.getDate()).padStart(2, "0");
    const dateStr = `${year}-${monthStr}-${dayStr}`;
    const monthKey = `${year}-${monthStr}`;

    const saleId = `sale-${Date.now()}`;
    const receiptNo = `REC-${year}${monthStr}${dayStr}-${String(Math.floor(100 + Math.random() * 900))}`;

    const earnedAmt = Number(salePayload.netAmount) || 0;
    const pointsEarned = Math.floor(earnedAmt / 1000);

    const newSale: Sale = {
      id: saleId,
      receiptNo,
      customerId: salePayload.customerId,
      customerName: salePayload.customerName,
      items: salePayload.items,
      totalAmount: salePayload.totalAmount,
      discountAmount: salePayload.discountAmount,
      netAmount: salePayload.netAmount,
      pointsEarned,
      pointsRedeemed: salePayload.pointsRedeemed || 0,
      date: dateStr,
      month: monthKey,
      year,
      paymentMethod: salePayload.paymentMethod,
      printedRef: false,
      cashier: salePayload.cashier || "Attendant"
    };

    const batch = writeBatch(db);

    // 1. Record Sale document
    batch.set(doc(db, "sales", saleId), newSale);

    // 2. Deduct product inventory stocks
    for (const item of salePayload.items) {
      const prod = currentProducts.find((p) => p.id === item.productId);
      if (prod) {
        const remainingStock = Math.max(0, prod.stockQuantity - item.quantity);
        batch.update(doc(db, "products", prod.id), {
          stockQuantity: remainingStock
        });
      }
    }

    // 3. Update customer loyalty & purchase record if customer selected
    if (salePayload.customerId && currentCustomer) {
      const updatedCount = (currentCustomer.purchaseCount || 0) + 1;
      const updatedSpent = (currentCustomer.totalSpent || 0) + earnedAmt;
      const remainingPoints = Math.max(
        0,
        (currentCustomer.loyaltyPoints || 0) + pointsEarned - (salePayload.pointsRedeemed || 0)
      );

      const existingPurchased = currentCustomer.purchasedItems || [];
      const newlyPurchased = salePayload.items.map((i) => ({
        productId: i.productId,
        name: i.name,
        quantity: i.quantity,
        pricePerUnit: i.pricePerUnit,
        totalPrice: i.totalPrice,
        date: dateStr,
        receiptNo
      }));

      batch.update(doc(db, "customers", salePayload.customerId), {
        purchaseCount: updatedCount,
        totalSpent: updatedSpent,
        loyaltyPoints: remainingPoints,
        purchasedItems: [...newlyPurchased, ...existingPurchased].slice(0, 50)
      });
    }

      await batch.commit();
      return newSale;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  }

  // Settings & Store Configuration (Manager Password with full character support)
  export async function getManagerPasswordFromFirestore(): Promise<string> {
    const path = "settings/store_config";
    try {
      const snap = await getDoc(doc(db, "settings", "store_config"));
      if (snap.exists() && snap.data()?.managerPassword) {
        return snap.data().managerPassword;
      }
      return "1234";
    } catch (err) {
      console.warn("Firestore settings read error:", err);
      return "1234";
    }
  }

  export function subscribeToStoreSettings(
    onUpdate: (settings: { managerPassword?: string }) => void,
    onError?: (err: any) => void
  ) {
    const path = "settings/store_config";
    try {
      return onSnapshot(
        doc(db, "settings", "store_config"),
        (snapshot) => {
          if (snapshot.exists() && snapshot.data()?.managerPassword) {
            onUpdate(snapshot.data() as any);
          } else {
            onUpdate({ managerPassword: "1234" });
          }
        },
        (err) => {
          if (onError) onError(err);
        }
      );
    } catch (err) {
      if (onError) onError(err);
      return () => {};
    }
  }

  export async function updateManagerPasswordInFirestore(newPassword: string): Promise<void> {
    const path = "settings/store_config";
    try {
      await setDoc(doc(db, "settings", "store_config"), { managerPassword: newPassword.trim() }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  }
