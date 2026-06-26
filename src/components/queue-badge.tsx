import { View, Text } from "react-native";

import { colors } from "@/theme/colors";
import { useOfflineStore } from "@/lib/offline/offline-store";

/** Yuborilmagan sotuvlar soni — mini badge (0 bo'lsa ko'rinmaydi). */
export function QueueBadge({ size = 18 }: { size?: number }) {
  const count = useOfflineStore((s) => s.pendingCount);
  if (count <= 0) return null;
  return (
    <View
      style={{
        position: "absolute", top: -5, right: -9, minWidth: size, height: size,
        paddingHorizontal: 4, borderRadius: size / 2, backgroundColor: colors.danger,
        alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "#fff",
      }}
    >
      <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>
        {count > 99 ? "99+" : count}
      </Text>
    </View>
  );
}
