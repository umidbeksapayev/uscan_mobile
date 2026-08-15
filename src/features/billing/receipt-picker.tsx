import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { useColors } from "@/theme/theme-store";
import { radius, space, text } from "@/theme/tokens";
import { Card } from "@/components/ui/card";
import { IconChip } from "@/components/ui/icon-chip";
import { formatFileSize, type PickedReceipt, type ReceiptSource } from "./receipt-upload";

/**
 * Chek tanlash/ko'rish bloki.
 *
 * Mobil qurilmada "drag & drop" mavjud emas — uning ekvivalenti katta,
 * aniq bosiladigan maydon va uchta manba (kamera / galereya / fayl).
 * Tanlangandan keyin preview + "o'chirish/qayta yuklash" (talab #4).
 */
export function ReceiptPicker({
  file,
  picking,
  disabled,
  onPick,
  onClear,
}: {
  file: PickedReceipt | null;
  picking: boolean;
  disabled?: boolean;
  onPick: (source: ReceiptSource) => void;
  onClear: () => void;
}) {
  const colors = useColors();
  const { t } = useTranslation();

  if (file) {
    return (
      <Card padded={false} style={{ overflow: "hidden" }}>
        {file.isPdf ? (
          <View
            style={{
              height: 150,
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              backgroundColor: colors.neutralTint,
            }}
          >
            <Ionicons name="document-text-outline" size={44} color={colors.muted} />
            <Text style={{ fontSize: text.xs, color: colors.muted }}>PDF</Text>
          </View>
        ) : (
          <Image
            source={{ uri: file.uri }}
            style={{ width: "100%", height: 220 }}
            contentFit="contain"
            transition={150}
          />
        )}

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: space.md,
            padding: space.md,
            borderTopWidth: 1,
            borderTopColor: colors.line,
          }}
        >
          <Ionicons name="checkmark-circle" size={20} color={colors.successInk} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: text.sm, fontWeight: "600", color: colors.ink }} numberOfLines={1}>
              {file.name}
            </Text>
            <Text style={{ fontSize: text.xs, color: colors.muted, marginTop: 2 }}>
              {formatFileSize(file.sizeBytes)}
            </Text>
          </View>
          <Pressable
            onPress={onClear}
            disabled={disabled}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t("billing.receiptRemove")}
            style={{ padding: 6, opacity: disabled ? 0.4 : 1 }}
          >
            <Ionicons name="trash-outline" size={20} color={colors.dangerInk} />
          </Pressable>
        </View>
      </Card>
    );
  }

  const SOURCES: { key: ReceiptSource; icon: keyof typeof Ionicons.glyphMap; labelKey: string }[] = [
    { key: "camera", icon: "camera-outline", labelKey: "billing.receiptCamera" },
    { key: "library", icon: "images-outline", labelKey: "billing.receiptGallery" },
    { key: "file", icon: "folder-outline", labelKey: "billing.receiptFile" },
  ];

  return (
    <View
      style={{
        borderRadius: radius.lg,
        borderWidth: 1.5,
        borderStyle: "dashed",
        borderColor: colors.primary,
        backgroundColor: colors.primaryTint,
        padding: space.lg,
        alignItems: "center",
        gap: space.md,
      }}
    >
      {picking ? (
        <View style={{ height: 92, alignItems: "center", justifyContent: "center", gap: 8 }}>
          <ActivityIndicator color={colors.primary} />
          <Text style={{ fontSize: text.xs, color: colors.muted }}>{t("billing.receiptReading")}</Text>
        </View>
      ) : (
        <>
          <IconChip icon="cloud-upload-outline" size="lg" tone="brand" />
          <Text
            style={{ fontSize: text.sm, color: colors.ink, textAlign: "center", fontWeight: "600" }}
          >
            {t("billing.receiptTitle")}
          </Text>
          <Text style={{ fontSize: text.xs, color: colors.muted, textAlign: "center" }}>
            {t("billing.receiptFormats")}
          </Text>

          <View style={{ flexDirection: "row", gap: space.sm, width: "100%", marginTop: 4 }}>
            {SOURCES.map((s) => (
              <Pressable
                key={s.key}
                onPress={() => onPick(s.key)}
                disabled={disabled}
                accessibilityRole="button"
                accessibilityLabel={t(s.labelKey)}
                style={{
                  flex: 1,
                  gap: 5,
                  paddingVertical: space.md,
                  borderRadius: radius.md,
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.line,
                  alignItems: "center",
                  opacity: disabled ? 0.5 : 1,
                }}
              >
                <Ionicons name={s.icon} size={20} color={colors.primary} />
                <Text style={{ fontSize: text.xs, color: colors.ink, fontWeight: "500" }}>
                  {t(s.labelKey)}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      )}
    </View>
  );
}
