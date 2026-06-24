import { View, Text } from "react-native";

import { colors } from "@/theme/colors";

/**
 * uscan brend logosi: "u" (to'q ko'k) + skaner-ramka ichida "scan" (yorqin ko'k)
 * + ochiq ko'k gorizontal chiziq. Brend listidagi belgi asosida.
 */
export function Logo({ size = 24 }: { size?: number }) {
  const frameH = Math.round(size * 1.5);
  const corner = Math.round(size * 0.36);
  const cb = 2.5;
  const base = {
    position: "absolute" as const,
    width: corner,
    height: corner,
    borderColor: colors.primaryDeep,
  };

  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <Text
        style={{
          fontSize: Math.round(size * 1.1),
          fontWeight: "800",
          color: colors.primaryDeep,
          marginRight: 3,
        }}
      >
        u
      </Text>

      <View
        style={{
          height: frameH,
          justifyContent: "center",
          paddingHorizontal: Math.round(size * 0.32),
        }}
      >
        {/* skaner-ramka burchaklari */}
        <View style={[base, { top: 0, left: 0, borderTopWidth: cb, borderLeftWidth: cb, borderTopLeftRadius: 6 }]} />
        <View style={[base, { top: 0, right: 0, borderTopWidth: cb, borderRightWidth: cb, borderTopRightRadius: 6 }]} />
        <View style={[base, { bottom: 0, left: 0, borderBottomWidth: cb, borderLeftWidth: cb, borderBottomLeftRadius: 6 }]} />
        <View style={[base, { bottom: 0, right: 0, borderBottomWidth: cb, borderRightWidth: cb, borderBottomRightRadius: 6 }]} />

        <Text
          style={{
            fontSize: size,
            fontWeight: "800",
            color: colors.primary,
            letterSpacing: -0.5,
          }}
        >
          scan
        </Text>

        {/* skaner chizig'i */}
        <View
          style={{
            position: "absolute",
            left: Math.round(size * 0.12),
            right: Math.round(size * 0.12),
            top: frameH / 2 - 1.5,
            height: 3,
            backgroundColor: colors.primaryLight,
            borderRadius: 2,
          }}
        />
      </View>
    </View>
  );
}
