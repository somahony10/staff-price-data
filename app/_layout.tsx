import { Stack } from "expo-router";
import { CartProvider } from "../src/cart/CartContext";
import { ScannerProvider } from "../src/scanner/ScannerContext";

export default function RootLayout() {
  return (
    <CartProvider>
      <ScannerProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </ScannerProvider>
    </CartProvider>
  );
}