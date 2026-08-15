import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useColors } from "@/theme/theme-store";
import { radius, text } from "@/theme/tokens";

/**
 * Checkout qadam ko'rsatkichi (talab #10: foydalanuvchi qayerdaligini
 * har doim bilishi kerak).
 *
 * `OnboardingShell` dagi nuqtalardan farqi: bu yerda qadamlar NOMLANGAN
 * va tugagani belgilanadi — to'lov jarayonida "keyingi qadam nima?" savoli
 * nuqtalardan ko'ra aniqroq javob talab qiladi.
 */
export function CheckoutSteps({ current }: { current: 1 | 2 | 3 }) {
  const colors = useColors();

  const steps = [1, 2, 3] as const;

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 18 }}>
      {steps.map((s, i) => {
        const done = s < current;
        const active = s === current;
        const bg = done || active ? colors.primary : colors.line;
        const fg = done || active ? "#fff" : colors.muted;

        return (
          <View key={s} style={{ flexDirection: "row", alignItems: "center", flex: i < 2 ? 1 : 0 }}>
            <View
              style={{
                width: 26,
                height: 26,
                borderRadius: radius.full,
                backgroundColor: bg,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {done ? (
                <Ionicons name="checkmark" size={15} color={fg} />
              ) : (
                <Text style={{ fontSize: text.xs, fontWeight: "700", color: fg }}>{s}</Text>
              )}
            </View>
            {i < 2 ? (
              <View
                style={{
                  flex: 1,
                  height: 2,
                  marginHorizontal: 6,
                  borderRadius: radius.full,
                  backgroundColor: s < current ? colors.primary : colors.line,
                }}
              />
            ) : null}
          </View>
        );
      })}
    </View>
  );
}
