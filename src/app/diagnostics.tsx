import { useCallback, useMemo, useState } from "react";
import { View, Text, FlatList, Pressable, ScrollView, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

import { useColors } from "@/theme/theme-store";
import { toast } from "@/lib/toast";
import { clearLog, logAsText, readLog } from "@/lib/logger";
import type { LogEntry } from "@/lib/log-buffer";
import type { LogDomain } from "@/lib/log-domain";
import { ScreenHeader } from "@/components/ui/screen";

/**
 * Diagnostika (A5) — qurilmadagi xatolik jurnali.
 *
 * Ilgari jimgina yutilgan xatolar shu yerda ko'rinadi. Jurnal faqat qurilmada
 * saqlanadi (telemetriya yuborilmaydi) — foydalanuvchi o'zi ulashadi.
 */
/** Domen filtri tugmasi — sanoq bilan (qaysi qism ko'p xato berayotgani ko'rinadi). */
function DomainChip({
  label,
  count,
  active,
  onPress,
}: {
  label: string;
  count: number;
  active: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`${label}: ${count}`}
      className="flex-row items-center gap-1.5 rounded-full px-3"
      style={{
        height: 32,
        backgroundColor: active ? colors.primary : colors.surface,
        borderWidth: 1,
        borderColor: active ? colors.primary : colors.line,
      }}
    >
      <Text
        className="text-xs font-semibold"
        style={{ color: active ? "#fff" : colors.ink }}
      >
        {label}
      </Text>
      <Text className="text-xs" style={{ color: active ? "#fff" : colors.muted }}>
        {count}
      </Text>
    </Pressable>
  );
}

export default function DiagnosticsScreen() {
  const colors = useColors();
  const { t } = useTranslation();

  const [entries, setEntries] = useState<LogEntry[]>(() => readLog());
  const [filter, setFilter] = useState<LogDomain | null>(null);

  /*
    Filtr tugmalari MAVJUD yozuvlardan quriladi — bo'sh domenni ko'rsatish
    foydalanuvchini "u yerda nimadir bor" deb adashtirardi. Sanoq bilan
    birga: qaysi qism ko'p xato berayotgani darhol ko'rinadi.
  */
  const domains = useMemo(() => {
    const counts = new Map<LogDomain, number>();
    for (const e of entries) {
      const d = e.domain ?? "APP";
      counts.set(d, (counts.get(d) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [entries]);

  const visible = useMemo(
    () => (filter ? entries.filter((e) => (e.domain ?? "APP") === filter) : entries),
    [entries, filter],
  );

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
        <View className="flex-row items-center justify-between gap-2">
          <View className="flex-1 flex-row items-center gap-2">
            <View
              className="rounded-md px-1.5 py-0.5"
              style={{ backgroundColor: colors.primaryTint }}
            >
              <Text className="text-xs font-semibold" style={{ color: colors.primary }}>
                {item.domain ?? "APP"}
              </Text>
            </View>
            <Text className="flex-1 text-xs text-muted" numberOfLines={1}>
              {item.scope}
            </Text>
          </View>
          <Text className="text-xs text-muted">{item.at.replace("T", " ").slice(0, 19)}</Text>
        </View>
        <Text className="mt-1 text-sm text-ink">{item.message}</Text>
      </View>
    ),
    [colors.line, colors.primary, colors.primaryTint],
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
        <>
          {domains.length > 1 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 10, gap: 6 }}
            >
              <DomainChip
                label={t("diagnostics.all", "Hammasi")}
                count={entries.length}
                active={filter === null}
                onPress={() => setFilter(null)}
              />
              {domains.map(([d, n]) => (
                <DomainChip
                  key={d}
                  label={d}
                  count={n}
                  active={filter === d}
                  onPress={() => setFilter(filter === d ? null : d)}
                />
              ))}
            </ScrollView>
          ) : null}
          <FlatList
            data={visible}
            keyExtractor={(e, i) => `${e.at}-${i}`}
            renderItem={renderItem}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          />
        </>
      )}
    </SafeAreaView>
  );
}
