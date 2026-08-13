import { useEffect, useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useTranslation } from "react-i18next";
import { useColors } from "@/theme/theme-store";
import { useOfflineStore } from "@/lib/offline/offline-store";

type Kind = "info" | "success" | "warn";

/** Sync holati toast'i (pastda, avtomatik yo'qoladi). */
export function SyncToast() {
  const colors = useColors();
  const { t } = useTranslation();

  const syncing = useOfflineStore((s) => s.syncing);
  const pendingCount = useOfflineStore((s) => s.pendingCount);
  const lastResult = useOfflineStore((s) => s.lastResult);
  const insets = useSafeAreaInsets();
  const [msg, setMsg] = useState<{ text: string; kind: Kind } | null>(null);

  // Yuborilmoqda — faqat haqiqatan navbat bor bo'lsa
  useEffect(() => {
    if (syncing && pendingCount > 0) {
      setMsg({ text: t("sync.sending"), kind: "info" });
    }
  }, [syncing, pendingCount, t]);

  // Natija
  useEffect(() => {
    if (!lastResult || syncing) return;
    if (lastResult.conflicts > 0) {
      setMsg({ text: t("sync.conflicts", { count: lastResult.conflicts }), kind: "warn" });
    } else if (lastResult.synced > 0) {
      setMsg({ text: t("sync.synced", { count: lastResult.synced }), kind: "success" });
    } else {
      setMsg(null);
      return;
    }
    const timer = setTimeout(() => setMsg(null), 3500);
    return () => clearTimeout(timer);
  }, [lastResult, syncing, t]);

  if (!msg) return null;
  const bg = msg.kind === "warn" ? colors.danger : msg.kind === "success" ? colors.kirim : colors.primaryDeep;

  return (
    <Animated.View
      entering={FadeInDown}
      exiting={FadeOutDown}
      pointerEvents="none"
      style={{ position: "absolute", left: 16, right: 16, bottom: insets.bottom + 84, alignItems: "center" }}
    >
      <View
        style={{
          flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: bg,
          paddingHorizontal: 16, paddingVertical: 11, borderRadius: 14,
        }}
      >
        {msg.kind === "info" ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Ionicons name={msg.kind === "warn" ? "alert-circle" : "checkmark-circle"} size={18} color="#fff" />
        )}
        <Text style={{ color: "#fff", fontWeight: "500" }}>{msg.text}</Text>
      </View>
    </Animated.View>
  );
}
