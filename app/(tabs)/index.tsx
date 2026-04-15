// cd C:\Users\somah\staff-price-app
// npx expo start -c
//eas build -p android --profile preview

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { router, useFocusEffect } from "expo-router";
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  Pressable,
  Animated,
  useWindowDimensions,
  Image,
} from "react-native";
import * as SQLite from "expo-sqlite";
import * as Haptics from "expo-haptics";
import { CameraView, useCameraPermissions } from "expo-camera";

import productsData from "../../data/products.json";
import { useCart } from "../../src/cart/CartContext";
import { useScanner } from "../../src/scanner/ScannerContext";

const db = SQLite.openDatabaseSync("products.db");

type Product = {
  id: number;
  stockCode: string;
  description: string;
  price: number;
  location: string;
};

const COLORS = {
  bg: "#0B1220",
  panel: "#111827",
  card: "#182235",
  border: "#22314A",
  text: "#F8FAFC",
  muted: "#94A3B8",
  soft: "#64748B",
  green: "#22C55E",
  greenDark: "#16A34A",
  danger: "#EF4444",
  white: "#FFFFFF",
};

const VAT_RATE = 0.23;
const PRODUCTS_URL =
  "https://somahony10.github.io/staff-price-data/data/products.json";

const formatPrice = (price: number) => Number(price).toFixed(2);
const getPriceIncVat = (price: number) =>
  Math.round(price * (1 + VAT_RATE) * 100) / 100;

const ProductRow = React.memo(function ProductRow({
  item,
  onAdd,
}: {
  item: Product;
  onAdd: (item: Product) => void;
}) {
  return (
    <Pressable
      style={styles.card}
      onPress={() =>
        router.push({
          pathname: "/product",
          params: {
            id: String(item.id),
            description: item.description,
            stockCode: item.stockCode,
            location: item.location,
            price: String(item.price),
          },
        })
      }
    >
      <View style={styles.cardTopRow}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {item.description}
        </Text>

        <View style={styles.pill}>
          <Text style={styles.pillText}>
            {item.location || "No location"}
          </Text>
        </View>
      </View>

      <Text style={styles.cardPriceBig}>
        €{formatPrice(getPriceIncVat(item.price))}
      </Text>

      <Text style={styles.cardPriceSmall}>
        Ex VAT: €{formatPrice(item.price)}
      </Text>

      <View style={styles.metaRow}>
        <Text style={styles.metaLabel}>Code</Text>
        <Text style={styles.metaValue}>{item.stockCode}</Text>
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.addBtn,
          { opacity: pressed ? 0.85 : 1 },
        ]}
        onPress={async (e) => {
          e.stopPropagation();
          onAdd(item);
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
      >
        <Text style={styles.addBtnText}>Add to Cart</Text>
      </Pressable>
    </Pressable>
  );
});

export default function Index() {
  const { addItem } = useCart();
  const { shouldOpenScanner, consumeOpenScanner } = useScanner();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const [permission, requestPermission] = useCameraPermissions();

  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);
  const [flashColor, setFlashColor] = useState(COLORS.green);

  const flashOpacity = useRef(new Animated.Value(0)).current;
  const bannerOpacity = useRef(new Animated.Value(0)).current;

  const scanLockRef = useRef(false);
  const navigationLockRef = useRef(false);

  const SCAN_BOX_W = 300;
  const SCAN_BOX_H = 150;

  const triggerFlash = (color: "green" | "red") => {
    setFlashColor(color === "green" ? COLORS.green : COLORS.danger);

    flashOpacity.stopAnimation();
    flashOpacity.setValue(0);

    Animated.sequence([
      Animated.timing(flashOpacity, {
        toValue: 0.25,
        duration: 90,
        useNativeDriver: true,
      }),
      Animated.timing(flashOpacity, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const triggerUpdateBanner = () => {
    setShowUpdateBanner(true);

    Animated.sequence([
      Animated.timing(bannerOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.delay(1200),
      Animated.timing(bannerOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => setShowUpdateBanner(false));
  };

  const refreshLastUpdated = useCallback(() => {
    try {
      const row = db.getFirstSync<{ value: string }>(
        `SELECT value FROM meta WHERE key='lastUpdated';`
      );
      setLastUpdated(row?.value ?? null);
    } catch (error) {
      console.log("Failed to load lastUpdated", error);
    }
  }, []);

  const initializeDatabase = () => {
    db.execSync(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        stockCode TEXT,
        description TEXT,
        price REAL,
        location TEXT
      );
    `);

    db.execSync(`
      CREATE TABLE IF NOT EXISTS meta (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `);

    db.execSync(
      `CREATE INDEX IF NOT EXISTS idx_description ON products(description);`
    );
    db.execSync(
      `CREATE INDEX IF NOT EXISTS idx_stockCode ON products(stockCode);`
    );

    const seeded = db.getFirstSync<{ value: string }>(
      `SELECT value FROM meta WHERE key='seeded';`
    );

    if (!seeded) {
      db.execSync("BEGIN;");

      try {
        const list = Array.isArray(productsData)
          ? productsData
          : (productsData as any)?.products ?? [];

        list.forEach((p: any) => {
          const priceParsed = parseFloat(String(p.price));
          const safePrice = Number.isFinite(priceParsed) ? priceParsed : 0;

          db.runSync(
            `INSERT INTO products (stockCode, description, price, location)
             VALUES (?, ?, ?, ?)`,
            [
              String(p.stockCode ?? "").trim(),
              String(p.description ?? "").trim(),
              safePrice,
              String(p.location ?? "").trim(),
            ]
          );
        });

        db.runSync(
          `INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)`,
          ["seeded", "true"]
        );
        db.runSync(
          `INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)`,
          ["version", "1.0.0"]
        );
        db.runSync(
          `INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)`,
          ["lastUpdated", new Date().toISOString()]
        );

        db.execSync("COMMIT;");
      } catch (error) {
        db.execSync("ROLLBACK;");
        throw error;
      }
    }
  };

  const checkForUpdates = async () => {
  try {
    console.log("Checking for updates...");

    const res = await fetch(`${PRODUCTS_URL}?t=${Date.now()}`);
    const json = await res.json();

    const products = Array.isArray(json)
      ? json
      : json?.products;

    if (!products || products.length === 0) return;

    const remoteVersion = String(json?.version ?? "0");

    const localVersionRow = db.getFirstSync<{ value: string }>(
      `SELECT value FROM meta WHERE key='version';`
    );

    const localVersion = localVersionRow?.value ?? null;

    if (remoteVersion === localVersion) {
      console.log("No update needed");
      return;
    }

    console.log(`Updating ${localVersion} → ${remoteVersion}`);

    db.execSync("BEGIN;");
    db.execSync("DELETE FROM products;");

    products.forEach((p: any) => {
      db.runSync(
        `INSERT INTO products (stockCode, description, price, location)
         VALUES (?, ?, ?, ?);`,
        [
          p.stockCode ?? "",
          p.description ?? "",
          parseFloat(p.price) || 0,
          p.location ?? "",
        ]
      );
    });

    const timestamp = new Date().toISOString();

    db.runSync(
      `INSERT OR REPLACE INTO meta (key,value) VALUES (?,?)`,
      ["lastUpdated", timestamp]
    );

    db.runSync(
      `INSERT OR REPLACE INTO meta (key,value) VALUES (?,?)`,
      ["version", remoteVersion]
    );

    db.execSync("COMMIT;");

    setLastUpdated(timestamp);
    triggerUpdateBanner();

    console.log("Update complete");
  } catch (err) {
    db.execSync("ROLLBACK;");
    console.log("Update failed", err);
  }
};

  useEffect(() => {
    const init = async () => {
      try {
        initializeDatabase();
        refreshLastUpdated();
        setIsReady(true);
        await checkForUpdates();
      } catch (e: any) {
        setInitError(String(e));
      }
    };

    init();
  }, [refreshLastUpdated]);

  useFocusEffect(
    useCallback(() => {
      refreshLastUpdated();
    }, [refreshLastUpdated])
  );

  useFocusEffect(
    useCallback(() => {
      if (!shouldOpenScanner) return;

      const openScanner = async () => {
        if (!permission?.granted) {
          const res = await requestPermission();
          if (!res.granted) {
            consumeOpenScanner();
            return;
          }
        }

        scanLockRef.current = false;
        navigationLockRef.current = false;
        setScanning(true);
        consumeOpenScanner();
      };

      openScanner();
    }, [shouldOpenScanner, permission, requestPermission, consumeOpenScanner])
  );

  const searchProducts = (text: string) => {
    setSearch(text);

    if (text.trim().length < 2) {
      setResults([]);
      return;
    }

    setIsSearching(true);

    setTimeout(() => {
      const rows = db.getAllSync<Product>(
        `SELECT * FROM products
         WHERE LOWER(description) LIKE LOWER(?) OR LOWER(stockCode) LIKE LOWER(?)
         ORDER BY
           CASE
             WHEN LOWER(stockCode) = LOWER(?) THEN 0
             WHEN LOWER(description) LIKE LOWER(?) THEN 1
             ELSE 2
           END,
           description ASC
         LIMIT 100`,
        [`%${text}%`, `%${text}%`, text, `${text}%`]
      );

      setResults(rows);
      setIsSearching(false);
    }, 120);
  };

  const renderItem = useCallback(
    ({ item }: { item: Product }) => (
      <ProductRow
        item={item}
        onAdd={(p) =>
          addItem({
            id: p.id,
            stockCode: p.stockCode,
            description: p.description,
            price: p.price,
            location: p.location,
          })
        }
      />
    ),
    [addItem]
  );

  if (initError) {
    return (
      <View style={styles.centerScreen}>
        <Text style={styles.errorTitle}>App failed</Text>
        <Text style={styles.errorText}>{initError}</Text>
      </View>
    );
  }

  if (!isReady) {
    return (
      <View style={styles.centerScreen}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (scanning) {
    return (
      <View style={styles.scannerScreen}>
        <CameraView
          style={{ flex: 1 }}
          barcodeScannerSettings={{
            barcodeTypes: [
              "ean13",
              "ean8",
              "upc_a",
              "upc_e",
              "code128",
              "code39",
            ],
          }}
          onBarcodeScanned={async (event) => {
            if (!scanning || scanLockRef.current || navigationLockRef.current) {
              return;
            }

            scanLockRef.current = true;

            const code = String(event.data ?? "");

            const rows = db.getAllSync<Product>(
              `SELECT * FROM products WHERE stockCode = ? LIMIT 1`,
              [code]
            );

            if (rows.length > 0) {
              const product = rows[0];

              navigationLockRef.current = true;
              setScanning(false);

              triggerFlash("green");

              await Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success
              );

              setTimeout(() => {
                router.push({
                  pathname: "/product",
                  params: {
                    id: String(product.id),
                    description: product.description,
                    stockCode: product.stockCode,
                    location: product.location,
                    price: String(product.price),
                  },
                });

                setTimeout(() => {
                  navigationLockRef.current = false;
                  scanLockRef.current = false;
                }, 300);
              }, 150);
            } else {
              triggerFlash("red");

              await Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Error
              );

              setTimeout(() => {
                setScanning(false);
                scanLockRef.current = false;
              }, 300);
            }
          }}
        />

        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            {
              backgroundColor: flashColor,
              opacity: flashOpacity,
            },
          ]}
        />

        <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
          <View style={styles.overlayRow}>
            <View style={styles.overlay} />
          </View>

          <View style={styles.overlayCenterRow}>
            <View style={styles.overlay} />
            <View
              style={[
                styles.scanBox,
                { width: SCAN_BOX_W, height: SCAN_BOX_H },
              ]}
            />
            <View style={styles.overlay} />
          </View>

          <View style={styles.overlayRow}>
            <View style={styles.overlay} />
          </View>
        </View>

        <View style={styles.scannerFooter}>
          <Text style={styles.scannerTitle}>Point camera at barcode</Text>
          <Text style={styles.scannerSubtitle}>
            Align barcode inside the frame
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.scannerCancelBtn,
              { opacity: pressed ? 0.85 : 1 },
            ]}
            onPress={() => {
              setScanning(false);
              scanLockRef.current = false;
              navigationLockRef.current = false;
            }}
          >
            <Text style={styles.scannerCancelText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.safe}>
      {showUpdateBanner && (
        <Animated.View
          pointerEvents="none"
          style={[styles.updateBanner, { opacity: bannerOpacity }]}
        >
          <Text style={styles.updateBannerText}>Prices updated</Text>
        </Animated.View>
      )}

      <View style={styles.container}>
        <Image
          source={require("../../assets/logo.png")}
          style={styles.logo}
        />

        <TextInput
          placeholder="Search product or code..."
          placeholderTextColor={COLORS.muted}
          value={search}
          onChangeText={searchProducts}
          style={styles.input}
        />

        {isSearching && (
          <Text style={styles.loadingSmall}>Searching...</Text>
        )}

        {lastUpdated && (
          <Text style={styles.lastUpdatedText}>
            Last updated: {new Date(lastUpdated).toLocaleString()}
          </Text>
        )}

        <Pressable
          style={({ pressed }) => [
            styles.scanBtn,
            { opacity: pressed ? 0.9 : 1 },
          ]}
          onPress={async () => {
            if (!permission?.granted) {
              const res = await requestPermission();
              if (!res.granted) return;
            }

            scanLockRef.current = false;
            navigationLockRef.current = false;
            setScanning(true);
          }}
        >
          <Text style={styles.scanBtnText}>
            {isUpdating ? "Updating..." : "Scan Barcode"}
          </Text>
        </Pressable>

        <FlatList
          data={results}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 140 }}
          keyboardShouldPersistTaps="handled"
          onRefresh={checkForUpdates}
          refreshing={isUpdating}
          ListEmptyComponent={
            search.trim().length >= 2 && !isSearching ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No matching product found</Text>
                <Text style={styles.emptyText}>
                  Try a different word, stock code, or use the scanner.
                </Text>
              </View>
            ) : null
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 60,
  },

  centerScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.bg,
  },

  loadingText: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "700",
  },

  loadingSmall: {
    color: COLORS.muted,
    marginBottom: 10,
  },

  errorTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },

  errorText: {
    color: COLORS.muted,
    textAlign: "center",
    paddingHorizontal: 24,
  },

  input: {
    backgroundColor: COLORS.panel,
    borderRadius: 12,
    padding: 14,
    color: COLORS.text,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  lastUpdatedText: {
    color: COLORS.soft,
    fontSize: 12,
    marginBottom: 12,
  },

  scanBtn: {
    backgroundColor: COLORS.green,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 12,
  },

  scanBtnText: {
    color: COLORS.bg,
    fontWeight: "800",
    fontSize: 16,
  },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  cardTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },

  cardTitle: {
    flex: 1,
    color: COLORS.text,
    fontWeight: "700",
    marginBottom: 6,
    fontSize: 16,
    lineHeight: 22,
  },

  pill: {
    backgroundColor: "#132033",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  pillText: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: "700",
  },

  cardPriceBig: {
    color: COLORS.green,
    fontSize: 24,
    fontWeight: "900",
    marginBottom: 2,
  },

  cardPriceSmall: {
    fontSize: 13,
    color: COLORS.muted,
    marginBottom: 10,
  },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },

  metaLabel: {
    color: COLORS.soft,
    fontSize: 12,
    textTransform: "uppercase",
    fontWeight: "700",
  },

  metaValue: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "600",
  },

  addBtn: {
    marginTop: 6,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#22314A",
  },

  addBtnText: {
    color: COLORS.text,
    fontWeight: "700",
  },

  emptyCard: {
    backgroundColor: COLORS.panel,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 6,
  },

  emptyTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 6,
  },

  emptyText: {
    color: COLORS.muted,
    lineHeight: 20,
  },

  logo: {
    width: 160,
    height: 80,
    alignSelf: "center",
    marginBottom: 16,
    resizeMode: "contain",
  },

  updateBanner: {
    position: "absolute",
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: COLORS.greenDark,
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    zIndex: 999,
    elevation: 6,
  },

  updateBannerText: {
    color: "#fff",
    fontWeight: "700",
  },

  scannerScreen: {
    flex: 1,
    backgroundColor: "#000",
  },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
  },

  overlayRow: {
    flex: 1,
  },

  overlayCenterRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  scanBox: {
    borderWidth: 3,
    borderColor: "#FFFFFF",
    borderRadius: 16,
    backgroundColor: "transparent",
  },

  scannerFooter: {
    position: "absolute",
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: "center",
  },

  scannerTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 4,
  },

  scannerSubtitle: {
    color: "#CBD5E1",
    fontSize: 13,
    marginBottom: 14,
  },

  scannerCancelBtn: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 12,
  },

  scannerCancelText: {
    color: "#000",
    fontWeight: "800",
  },
});