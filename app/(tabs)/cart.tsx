import React, { useCallback } from "react";
import { View, Text, FlatList, Pressable, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { useCart } from "../../src/cart/CartContext";
import { ListRenderItem } from "react-native";


const COLORS = {
  bg: "#0B1220",
  panel: "#111827",
  card: "#182235",
  border: "#22314A",
  text: "#F8FAFC",
  muted: "#94A3B8",
  soft: "#64748B",
  green: "#22C55E",
  danger: "#EF4444",
};

type Product = {
  id: number;
  stockCode: string;
  description: string;
  price: number;
  location: string;
  qty: number; // 👈 IMPORTANT for cart
};
const VAT_RATE = 0.23;

export default function CartScreen() {
  const { items, addItem, decItem, removeItem, clear, totalQty, totalPrice } =
    useCart();

  const totalIncVat = totalPrice * (1 + VAT_RATE);

  const renderItem: ListRenderItem<Product> = useCallback(
  ({ item }) => {
    const itemIncVat = item.price * (1 + VAT_RATE);
    const itemTotal = item.price * item.qty * (1 + VAT_RATE);

    return (
      <View style={styles.card}>
        <Text style={styles.desc}>{item.description}</Text>
        <Text style={styles.meta}>{item.stockCode}</Text>

        {/* Prices */}
        <Text style={styles.itemPrice}>€{itemIncVat.toFixed(2)}</Text>
        <Text style={styles.itemSub}>Ex VAT: €{item.price.toFixed(2)}</Text>

        {/* Item total */}
        <Text style={styles.itemTotal}>
          Total: €{itemTotal.toFixed(2)}
        </Text>

        <Text style={styles.location}>{item.location}</Text>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Controls */}
        <View style={styles.rowBottom}>
          <View style={styles.qtyBox}>
            <Pressable
              style={({ pressed }) => [
                styles.qtyBtn,
                { opacity: pressed ? 0.7 : 1 },
              ]}
              onPress={async () => {
                decItem(item.id);
                await Haptics.impactAsync(
                  Haptics.ImpactFeedbackStyle.Light
                );
              }}
            >
              <Text style={styles.qtyBtnText}>−</Text>
            </Pressable>

            <Text style={styles.qty}>{item.qty}</Text>

            <Pressable
              style={({ pressed }) => [
                styles.qtyBtn,
                { opacity: pressed ? 0.7 : 1 },
              ]}
              onPress={async () => {
                addItem(item);
                await Haptics.impactAsync(
                  Haptics.ImpactFeedbackStyle.Light
                );
              }}
            >
              <Text style={styles.qtyBtnText}>+</Text>
            </Pressable>
          </View>

          <Pressable
            onPress={async () => {
              removeItem(item.id);
              await Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Warning
              );
            }}
          >
            <Text style={styles.removeText}>Remove</Text>
          </Pressable>
        </View>
      </View>
    );
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Cart</Text>

      {/* Summary */}
      <View style={styles.summary}>
        <View>
          <Text style={styles.summaryLabel}>Items</Text>
          <Text style={styles.summaryValue}>{totalQty}</Text>
        </View>

        <View style={{ alignItems: "flex-end" }}>
          <Text style={styles.summaryLabel}>Total (inc VAT)</Text>

          <Text style={styles.totalBig}>
            €{totalIncVat.toFixed(2)}
          </Text>

          <Text style={styles.vatText}>
            Ex VAT: €{totalPrice.toFixed(2)}
          </Text>
        </View>
      </View>

      {/* List */}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 180 }}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Cart is empty</Text>
            <Text style={styles.emptyText}>
              Search or scan a product to get started
            </Text>
          </View>
        }
      />

      {/* Clear Button */}
      {items.length > 0 && (
        <Pressable
          style={({ pressed }) => [
            styles.clearFloating,
            { opacity: pressed ? 0.8 : 1 },
          ]}
          onPress={async () => {
            clear();
            await Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Success
            );
          }}
        >
          <Text style={styles.clearText}>Clear Cart</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    paddingTop: 60,
    paddingHorizontal: 16,
  },

  title: {
    fontSize: 26,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 14,
  },

  summary: {
    backgroundColor: COLORS.panel,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  summaryLabel: {
    color: COLORS.muted,
    fontSize: 12,
    marginBottom: 4,
  },

  summaryValue: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "800",
  },

  totalBig: {
    color: COLORS.green,
    fontSize: 30,
    fontWeight: "900",
  },

  vatText: {
    color: COLORS.green,
    fontSize: 13,
    marginTop: 4,
  },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  desc: {
    color: COLORS.text,
    fontWeight: "700",
    fontSize: 16,
    marginBottom: 4,
  },

  meta: {
    color: COLORS.muted,
    fontSize: 13,
  },

  itemPrice: {
    color: COLORS.green,
    fontSize: 18,
    fontWeight: "800",
    marginTop: 4,
  },

  itemSub: {
    color: COLORS.muted,
    fontSize: 12,
  },

  itemTotal: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "700",
    marginTop: 4,
  },

  location: {
    color: COLORS.soft,
    fontSize: 12,
    marginTop: 4,
  },

  divider: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginVertical: 10,
  },

  rowBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  qtyBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  qtyBtn: {
    backgroundColor: "#1E293B",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },

  qtyBtnText: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "800",
  },

  qty: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "700",
    width: 30,
    textAlign: "center",
  },

  removeText: {
    color: COLORS.danger,
    fontWeight: "700",
  },

  emptyCard: {
    backgroundColor: COLORS.panel,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 20,
  },

  emptyTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 6,
  },

  emptyText: {
    color: COLORS.muted,
  },

  clearFloating: {
    position: "absolute",
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: "#22314A",
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
    elevation: 6,
  },

  clearText: {
    color: COLORS.text,
    fontWeight: "800",
  },
});