import { View, Text } from "react-native";

import { useColors } from "@/theme/theme-store";
import { radius, text } from "@/theme/tokens";

/**
 * "84 / 100" hisoblagichi + ingichka progress chizig'i (katalog sarlavhasi).
 * `limit === null` bo'lsa (cheksiz — Ultra) HECH NARSA chizmaydi, chunki
 * cheksiz sondan hisoblagich foydasiz shovqin bo'lardi.
 */
export function LimitMeter({ used, limit }: { used: number; limit: number | null }) {
  const colors = useColors();

  if (limit === null) return null;

  const pct = Math.max(0, Math.min(1, limit > 0 ? used / limit : 1));
  const atLimit = used >= limit;
  const color = atLimit ? colors.danger : pct >= 0.8 ? colors.warning : colors.muted;

  return (
    <View style={{ gap: 4, minWidth: 64 }}>
      <Text style={{ fontSize: text.xs, fontWeight: "600", color, textAlign: "right" }}>
        {used} / {limit}
      </Text>
      <View
        style={{
          height: 4,
          borderRadius: radius.full,
          backgroundColor: colors.line,
          overflow: "hidden",
        }}
      >
        <View style={{ height: 4, width: `${pct * 100}%`, borderRadius: radius.full, backgroundColor: color }} />
      </View>
    </View>
  );
}
