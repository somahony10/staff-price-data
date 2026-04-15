import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useCart } from "../src/cart/CartContext";
import * as Haptics from "expo-haptics";

const VAT_RATE = 0.23;

const COLORS = {
  bg: "#0B1220",
  panel: "#111827",
  card: "#182235",
  border: "#22314A",
  text: "#F8FAFC",
  muted: "#94A3B8",
  soft: "#64748B",
  green: "#22C55E",
};

const formatPrice = (price: number) => Number(price).toFixed(2);
const getPriceIncVat = (price: number) =>
  Math.round(price * (1 + VAT_RATE) * 100) / 100;

export default function ProductScreen() {
  const params = useLocalSearchParams();
  const { addItem } = useCart();

  const [added, setAdded] = useState(false);

  const description = String(params.description || "");
  const stockCode = String(params.stockCode || "");
  const location = String(params.location || "");
  const price = Number(params.price || 0);

  const handleAdd = async () => {
    addItem({
      id: Number(params.id || 0),
      stockCode,
      description,
      price,
      location,
    });

    setAdded(true);

    await Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Success
    );

    setTimeout(() => setAdded(false), 1200);
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  };

  const handleScanAgain = () => {
    router.replace("/?scan=1");
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.description}>{description}</Text>

        <Text style={styles.priceBig}>
          €{formatPrice(getPriceIncVat(price))}
        </Text>

        <Text style={styles.priceSmall}>
          Ex VAT: €{formatPrice(price)}
        </Text>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Stock</Text>
          <Text style={styles.value}>{stockCode}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Location</Text>
          <Text style={styles.value}>{location || "—"}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [
            styles.cartButton,
            added && styles.cartButtonAdded,
            { opacity: pressed ? 0.85 : 1 },
          ]}
          onPress={handleAdd}
          disabled={added}
        >
          <Text
            style={[
              styles.cartButtonText,
              added && styles.cartButtonTextAdded,
            ]}
          >
            {added ? "Added to cart ✓" : "Add to Cart"}
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.secondaryBtn,
            { opacity: pressed ? 0.7 : 1 },
          ]}
          onPress={handleScanAgain}
        >
          <Text style={styles.secondaryText}>Scan Again</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.ghostBtn,
            { opacity: pressed ? 0.6 : 1 },
          ]}
          onPress={handleBack}
        >
          <Text style={styles.ghostText}>Back</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    paddingHorizontal: 20,
    paddingTop: 80,
  },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
  },

  description: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 12,
  },

  priceBig: {
    fontSize: 44,
    fontWeight: "900",
    color: COLORS.green,
    marginBottom: 6,
  },

  priceSmall: {
    fontSize: 14,
    color: COLORS.muted,
    marginBottom: 16,
  },

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },

  label: {
    color: COLORS.soft,
    fontSize: 12,
    textTransform: "uppercase",
  },

  value: {
    color: COLORS.text,
    fontWeight: "700",
  },

  actions: {
    marginTop: 10,
  },

  cartButton: {
    backgroundColor: COLORS.green,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 10,
  },

  cartButtonAdded: {
    backgroundColor: "#16A34A",
  },

  cartButtonText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#000",
  },

  cartButtonTextAdded: {
    color: "#000",
  },

  secondaryBtn: {
    backgroundColor: COLORS.panel,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  secondaryText: {
    color: COLORS.text,
    fontWeight: "700",
  },

  ghostBtn: {
    paddingVertical: 10,
    alignItems: "center",
  },

  ghostText: {
    color: COLORS.muted,
    fontWeight: "600",
  },
});