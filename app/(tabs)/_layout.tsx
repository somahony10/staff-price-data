import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const COLORS = {
  bg: "#0B1220",
  panel: "#111827",
  border: "#22314A",
  active: "#22C55E",
  inactive: "#94A3B8",
};

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,

        tabBarStyle: {
          position: "absolute",
          bottom: 20,
          left: "50%",
          marginLeft: 100, // half of width
          width: 200,

          height: 60,
          borderRadius: 20,
          backgroundColor: "#111827",
          borderTopWidth: 0,
          elevation: 10,

          alignSelf: "center", // 👈 THIS is the key

          shadowColor: "#000",
          shadowOpacity: 0.25,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 5 },
        },

        tabBarItemStyle: {
          flex: 1, // 👈 evenly spaced inside small container
          

        
        },

        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
          color: "#22C55E"
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Search",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="cart"
        options={{
          title: "Cart",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cart" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}



