import { useCallback, useState } from "react";
import { View, Text, FlatList, Pressable, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

import { useColors } from "@/theme/theme-store";
import { toast } from "@/lib/toast";
import { clearLog, logAsText, readLog } from "@/lib/logger";
import type { LogEntry } from "@/lib/log-buffer";
import { ScreenHeader } from "@/components/ui/screen";

/**
 * Diagnostika (A5) — qurilmadagi xatolik jurnali.
 *
 * Ilgari jimgina yutilgan xatolar shu yerda ko'rinadi. Jurnal faqat qurilmada
 * saqlanadi (telemetriya yuborilmaydi) — foydalanuvchi o'zi ulashadi.
 */
export default function DiagnosticsScreen() {
  const colors = useColors();
  const { t } = useTranslation();

  const [entries, setEntries] = useState<LogEntry[]>(() => readLog());

  const onShare = useCallback(async () => {
    const text = logAsText();
    if (!text) {
      toast.info(t("diagnostics.empty", "Jurnal bo'sh"));
      return;
    }
    const file = new File(Paths.cache, `uscan_diagnostika_${Date.now()}.txt`);
    if (file.exists) file.delete();
    file.create();
    file.write(text);

    if (!(await Sharing.isAvailableAsync())) {
      toast.error(t("diagnostics.shareUnavailable", "Ulashish mavjud emas"));
      return;
    }
    await Sharing.shareAsync(file.uri, {
      mimeType: "text/plain",
      UTI: "public.plain-text",
      dialogTitle: t("diagnostics.title", "Diagnostika"),
    });
  }, [t]);

  const onClear = useCallback(() => {
    Alert.alert(
      t("diagnostics.clearTitle", "Jurnalni tozalash"),
      t("diagnostics.clearBody", "Barcha yozuvlar o'chiriladi."),
      [
        { text: t("common.cancel", "Bekor qilish"), style: "cancel" },
        {
          text: t("diagnostics.clearBtn", "Tozalash"),
          style: "destructive",
          onPress: () => {
            clearLog();
            setEntries([]);
          },
        },
      ],
    );
  }, [t]);

  const renderItem = useCallback(
    ({ item }: { item: LogEntry }) => (
      <View
        className="mb-2 rounded-2xl bg-surface p-3"
        style={{ borderWidth: 0.5, borderColor: colors.line }}
      >
        <View className="flex-row items-center justify-between">
          <Text className="text-xs font-semibold" style={{ color: colors.primary }}>
            {item.scope}
          </Text>
          <Text className="text-xs text-muted">{item.at.replace("T", " ").slice(0, 19)}</Text>
        </View>
        <Text className="mt-1 text-sm text-ink">{item.message}</Text>
      </View>
    ),
    [colors.line, colors.primary],
  );

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <ScreenHeader
        title={t("diagnostics.title", "Diagnostika")}
        right={
          <>
            <Pressable
              onPress={() => void onShare()}
              accessibilityRole="button"
              accessibilityLabel={t("diagnostics.share", "Ulashish")}
              hitSlop={10}
              className="h-10 w-10 items-center justify-center"
            >
              <Ionicons name="share-outline" size={22} color={colors.primary} />
            </Pressable>
            <Pressable
              onPress={onClear}
              accessibilityRole="button"
              accessibilityLabel={t("diagnostics.clearBtn", "Tozalash")}
              hitSlop={10}
              className="h-10 w-10 items-center justify-center"
            >
              <Ionicons name="trash-outline" size={21} color={colors.danger} />
            </Pressable>
          </>
        }
      />

      <Text className="px-4 pb-2 text-xs text-muted" style={{ lineHeight: 17 }}>
        {t(
          "diagnostics.hint",
          "Xatolar faqat shu qurilmada saqlanadi (oxirgi 50 ta). Muammo bo'lsa jurnalni bizga ulashing.",
        )}
      </Text>

      {entries.length === 0 ? (
        <View className="flex-1 items-center justify-center gap-3 px-8">
          <Ionicons name="checkmark-circle-outline" size={44} color={colors.tabInactive} />
          <Text className="text-center text-base text-muted">
            {t("diagnostics.empty", "Jurnal bo'sh")}
          </Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(e, i) => `${e.at}-${i}`}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        />
      )}
    </SafeAreaView>
  );
}
