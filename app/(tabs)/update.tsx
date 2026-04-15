import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Alert } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as SQLite from "expo-sqlite";

const db = SQLite.openDatabaseSync("products.db");

const COLORS = {
  bg: "#0B1220",
  panel: "#111827",
  card: "#182235",
  border: "#22314A",
  text: "#F8FAFC",
  muted: "#94A3B8",
  green: "#22C55E",
};

// CHANGE THIS TO YOUR REAL URL
const PRODUCTS_URL = "https://somahony10.github.io/staff-price-data/products.json";

type IncomingProduct = {
  stockCode: string;
  description: string;
  price: number | string;
  location?: string;
};

const normalizeProducts = (raw: any): IncomingProduct[] | null => {
  if (!Array.isArray(raw) || raw.length === 0) return null;

  const out: IncomingProduct[] = [];

  for (const item of raw) {
    const stockCode =
      item?.stockCode ?? item?.StockCode ?? item?.["Stock Code"] ?? item?.["stock code"];
    const description =
      item?.description ?? item?.Description ?? item?.["Description"];
    const price =
      item?.price ?? item?.Price ?? item?.["Sales Price"] ?? item?.["SalesPrice"] ?? item?.["sales price"];
    const location =
      item?.location ?? item?.Location ?? item?.["Location"] ?? "";

    if (stockCode == null || description == null || price == null) continue;

    out.push({
      stockCode: String(stockCode).trim(),
      description: String(description).trim(),
      price,
      location: String(location ?? "").trim(),
    });
  }

  return out.length ? out : null;
};

export default function UpdateScreen() {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  const runUpdate = async () => {
    try {
      setBusy(true);
      setStatus("Downloading latest prices...");

      const response = await FileSystem.downloadAsync(
        PRODUCTS_URL,
        FileSystem.cacheDirectory + "products-live.json"
      );

      const jsonText = await FileSystem.readAsStringAsync(response.uri);
      const raw = JSON.parse(jsonText);
      const normalized = normalizeProducts(raw);

      if (!normalized) {
        Alert.alert(
          "Update failed",
          "No valid rows found in the downloaded JSON."
        );
        setStatus("Update failed.");
        return;
      }

      setStatus(`Updating database with ${normalized.length} products...`);

      db.execSync("BEGIN TRANSACTION;");

      try {
        db.execSync(`DROP TABLE IF EXISTS products;`);

        db.execSync(`
          CREATE TABLE products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            stockCode TEXT,
            description TEXT,
            price REAL,
            location TEXT
          );
        `);

        db.execSync(`CREATE INDEX IF NOT EXISTS idx_description ON products(description);`);
        db.execSync(`CREATE INDEX IF NOT EXISTS idx_stockCode ON products(stockCode);`);

        db.execSync(`
          CREATE TABLE IF NOT EXISTS meta (
            key TEXT PRIMARY KEY,
            value TEXT
          );
        `);

        for (let i = 0; i < normalized.length; i++) {
          const p = normalized[i];
          const priceNum = Number.isFinite(parseFloat(String(p.price)))
            ? parseFloat(String(p.price))
            : 0;

          db.runSync(
            `INSERT INTO products (stockCode, description, price, location)
             VALUES (?, ?, ?, ?);`,
            [p.stockCode, p.description, priceNum, p.location ?? ""]
          );
        }

        db.runSync(
          `INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?);`,
          ["lastUpdated", new Date().toISOString()]
        );

        db.runSync(
          `INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?);`,
          ["seeded", "true"]
        );

        db.execSync("COMMIT;");
      } catch (error) {
        db.execSync("ROLLBACK;");
        throw error;
      }

      setStatus("Prices updated successfully.");
      Alert.alert("Success", `Updated ${normalized.length} products.`);
    } catch (error: any) {
      console.log("LIVE UPDATE ERROR:", error);
      Alert.alert("Update failed", String(error?.message || error));
      setStatus("Update failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
      <Text style={styles.title}>Live Price Update</Text>
      <Text style={styles.help}>
        Downloads the latest products.json from your hosted URL and replaces the local database.
      </Text>

      <Pressable
        style={[styles.button, busy && { opacity: 0.6 }]}
        disabled={busy}
        onPress={runUpdate}
      >
        <Text style={styles.buttonText}>
          {busy ? "Updating..." : "Download Latest Prices"}
        </Text>
      </Pressable>

      {busy && <ActivityIndicator style={{ marginTop: 14 }} />}

      {!!status && <Text style={styles.status}>{status}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 10,
  },
  help: {
    color: COLORS.text,
    marginTop: 8,
    marginBottom: 18,
    lineHeight: 18,
  },
  button: {
    backgroundColor: COLORS.green,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#000",
  },
  status: {
    marginTop: 16,
    color: COLORS.text,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
});