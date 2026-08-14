import { memo, useCallback, useState } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator, FlatList } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { File } from "expo-file-system";
import { useTranslation } from "react-i18next";

import { useColors } from "@/theme/theme-store";
import type { AppColors } from "@/theme/colors";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { useActiveShopId, useActivePermissions } from "@/features/auth/use-memberships";
import {
  parseCsv,
  buildPreview,
  toImportPayload,
  type ImportPreviewResult,
  type ImportPreviewRow,
  type ImportRowStatus,
} from "@/features/products/import-products";
import { getExistingBarcodes, importProducts, type ImportResult } from "@/features/products/import-api";
import { parsePlanLimitError, type PlanLimitError } from "@/features/billing/parse-plan-error";
import { UpgradeSheet } from "@/features/billing/upgrade-sheet";
import { text } from "@/theme/tokens";
import { ScreenHeader } from "@/components/ui/screen";

type Status = "idle" | "loading" | "preview" | "importing" | "done";

/** Palitradan olinadi — tungi rejimda fon/matn avtomatik teskarilanadi. */
function statusBadge(
  colors: AppColors
): Record<ImportRowStatus, { bg: string; text: string; label: string }> {
  return {
    valid: { bg: colors.successTint, text: colors.successInk, label: "Yaroqli" },
    error: { bg: colors.dangerTint, text: colors.dangerInk, label: "Xato" },
    duplicate: { bg: colors.warningTint, text: colors.warningInk, label: "Dublikat" },
  };
}

const ERROR_LABELS: Record<string, string> = {
  name_required: "Nomi yo'q",
  invalid_type: "Tur noto'g'ri (dona/kg)",
  invalid_cost: "Tan narx noto'g'ri",
  invalid_selling: "Sotuv narx noto'g'ri",
  invalid_quantity: "Miqdor noto'g'ri",
  unit_not_integer: "DONALI miqdor butun son bo'lishi kerak",
};

function RequiredHeaderHint() {
  const { t } = useTranslation();
  return (
    <View className="rounded-2xl border border-line bg-surface p-4" style={{ gap: 6 }}>
      <Text className="text-sm font-medium text-ink">{t("import.requiredCols")}</Text>
      <Text className="text-xs text-muted">{t("import.columnsHint")}</Text>
      <Text className="text-xs text-muted">{t("import.colsNote")}</Text>
    </View>
  );
}

/**
 * CSV oldindan ko'rish qatori. `memo` (audit A10): import faylida yuzlab
 * qator bo'lishi mumkin.
 */
const PreviewRowItem = memo(function PreviewRowItem({ row }: { row: ImportPreviewRow }) {
  const colors = useColors();

  const { t } = useTranslation();
  const badge = statusBadge(colors)[row.status];
  const badgeLabel = t(`import.status_${row.status}`, badge.label);
  return (
    <View
      className="mb-2 rounded-2xl border border-line bg-surface p-3"
      style={{ gap: 4 }}
    >
      <View className="flex-row items-center justify-between">
        <Text className="flex-1 text-sm font-medium text-ink" numberOfLines={1}>
          {row.name || `#${row.rowNumber}`}
        </Text>
        <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: badge.bg }}>
          <Text style={{ fontSize: text.xs, fontWeight: "500", color: badge.text }}>{badgeLabel}</Text>
        </View>
      </View>
      {row.status === "error" ? (
        <Text className="text-xs" style={{ color: colors.danger }}>
          {row.errors.map((e) => t(`import.err.${e}`, ERROR_LABELS[e] ?? e)).join(", ")}
        </Text>
      ) : (
        <Text className="text-xs text-muted">
          {row.saleType === "weight" ? t("catalog.weight") : t("catalog.unit")} · {row.quantity} ·{" "}
          {row.sellingPrice.toLocaleString("ru-RU")} {t("common.som")}
          {row.category ? ` · ${row.category}` : ""}
        </Text>
      )}
    </View>
  );
});

export default function ImportProductsScreen() {
  const colors = useColors();

  const router = useRouter();
  const qc = useQueryClient();
  const { t } = useTranslation();
  const shopId = useActiveShopId();
  const { canManageProducts } = useActivePermissions();

  /** Barqaror `renderItem` (audit A10) — `PreviewRowItem` memo bilan juftlashadi. */
  const renderPreviewRow = useCallback(
    ({ item }: { item: ImportPreviewRow }) => <PreviewRowItem row={item} />,
    [],
  );

  const [status, setStatus] = useState<Status>("idle");
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [planLimitError, setPlanLimitError] = useState<PlanLimitError | null>(null);

  if (!canManageProducts) {
    return (
      <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
        <ScreenHeader title={t("import.title")} />
        <View className="flex-1 items-center justify-center px-10" style={{ gap: 8 }}>
          <Ionicons name="lock-closed" size={36} color={colors.muted} />
          <Text className="text-center text-sm text-muted">
            {t("import.gatePerm")}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  function reset() {
    setStatus("idle");
    setFileName(null);
    setPreview(null);
    setResult(null);
    setErrorMsg(null);
  }

  async function pickFile() {
    setErrorMsg(null);
    // DINAMIK import: eski dev build'da (native modul yo'q) eager import butun
    // ilovani quladi — expo-router BARCHA route'larni startup'da yuklaydi
    // (#21 ExpoCrypto bilan bir xil sinf). Modul bo'lmasa faqat shu tugma o'chadi.
    let DocumentPicker: typeof import("expo-document-picker");
    try {
      DocumentPicker = await import("expo-document-picker");
    } catch {
      setErrorMsg(t("import.noPickerModule"));
      return;
    }
    const picked = await DocumentPicker.getDocumentAsync({ type: "*/*", copyToCacheDirectory: true });
    if (picked.canceled || !picked.assets?.[0]) return;
    const asset = picked.assets[0];
    if (!/\.csv$/i.test(asset.name)) {
      setErrorMsg(t("import.csvOnly"));
      return;
    }
    if (!shopId) return;

    setStatus("loading");
    setFileName(asset.name);
    try {
      const text = await new File(asset.uri).text();
      const grid = parseCsv(text);
      const existing = await getExistingBarcodes(shopId);
      const built = buildPreview(grid, { existingBarcodes: existing });
      setPreview(built);
      setStatus("preview");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : t("import.parseError"));
      setStatus("idle");
    }
  }

  async function onImport() {
    if (!shopId || !preview) return;
    const payload = toImportPayload(preview.rows);
    if (payload.length === 0) return;
    setStatus("importing");
    try {
      const res = await importProducts(shopId, payload);
      setResult(res);
      setStatus("done");
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["categories"] });
    } catch (e) {
      const message = e instanceof Error ? e.message : null;
      // Tarif limiti — `import_products` RPC bitta tranzaksiya, shuning uchun
      // limitga urilganda BUTUN import bekor bo'ladi (yarim import emas).
      // Foydalanuvchi tarifni yangilagach yoki ortiqcha qatorlarni olib
      // tashlagach qaytadan urinadi — shu sabab `preview` holatida qolamiz.
      const planErr = parsePlanLimitError(message);
      if (planErr) {
        setPlanLimitError(planErr);
      } else {
        toast.error(t("import.importError"), message ?? t("import.importFailed"));
      }
      setStatus("preview");
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <ScreenHeader title={t("import.title")} />

      {status === "idle" ? (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
          <RequiredHeaderHint />
          {errorMsg ? (
            <Text className="text-center text-sm text-danger">{errorMsg}</Text>
          ) : null}
          <Pressable
            onPress={pickFile}
            className="flex-row items-center justify-center gap-2 rounded-2xl bg-primary"
            style={{ height: 56 }}
          >
            <Ionicons name="document-attach-outline" size={22} color="#fff" />
            <Text className="text-base font-medium text-white">{t("import.pickCsv")}</Text>
          </Pressable>
        </ScrollView>
      ) : status === "loading" ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
          <Text className="mt-3 text-sm text-muted">{t("import.parsing")}</Text>
        </View>
      ) : status === "preview" && preview ? (
        preview.headerError ? (
          <View className="flex-1 items-center justify-center px-10" style={{ gap: 12 }}>
            <Ionicons name="alert-circle-outline" size={36} color={colors.danger} />
            <Text className="text-center text-sm text-muted">
              {t("import.headerError")}
            </Text>
            <Pressable onPress={reset} className="p-2">
              <Text className="text-sm font-medium text-primary">{t("import.chooseAnother")}</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View className="px-4 pb-2">
              <Text className="text-sm text-muted" numberOfLines={1}>
                {fileName} · {t("import.fileRows", { count: preview.rows.length })}
              </Text>
              <View className="mt-2 flex-row gap-2">
                <View className="flex-1 items-center rounded-xl bg-bg py-2">
                  <Text className="text-base font-medium" style={{ color: colors.successInk }}>
                    {preview.validCount}
                  </Text>
                  <Text className="text-xs text-muted">{t("import.status_valid")}</Text>
                </View>
                <View className="flex-1 items-center rounded-xl bg-bg py-2">
                  <Text className="text-base font-medium" style={{ color: colors.warningInk }}>
                    {preview.duplicateCount}
                  </Text>
                  <Text className="text-xs text-muted">{t("import.status_duplicate")}</Text>
                </View>
                <View className="flex-1 items-center rounded-xl bg-bg py-2">
                  <Text className="text-base font-medium text-danger">{preview.errorCount}</Text>
                  <Text className="text-xs text-muted">{t("import.status_error")}</Text>
                </View>
              </View>
            </View>
            <FlatList
              data={preview.rows}
              keyExtractor={(r) => String(r.rowNumber)}
              renderItem={renderPreviewRow}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
            />
            <View className="border-t border-line bg-surface px-4 pt-3" style={{ paddingBottom: 14, gap: 8 }}>
              <Button
                label={t("import.confirmBtn", { count: preview.validCount })}
                onPress={onImport}
                disabled={preview.validCount === 0}
              />
              <Pressable onPress={reset} className="items-center p-2">
                <Text className="text-sm text-muted">{t("import.chooseAnother")}</Text>
              </Pressable>
            </View>
          </>
        )
      ) : status === "importing" ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
          <Text className="mt-3 text-sm text-muted">{t("import.importing")}</Text>
        </View>
      ) : status === "done" && result ? (
        <View className="flex-1 items-center justify-center px-10" style={{ gap: 8 }}>
          <View
            className="mb-2 h-20 w-20 items-center justify-center rounded-full"
            style={{ backgroundColor: colors.successTint }}
          >
            <Ionicons name="checkmark" size={40} color={colors.success} />
          </View>
          <Text className="text-center text-xl font-medium text-ink">{t("import.done")}</Text>
          <Text className="text-center text-sm text-muted">
            {t("import.resultInserted", { count: result.inserted })}
            {result.categories_created > 0 ? `, ${t("import.resultCategories", { count: result.categories_created })}` : ""}
            {result.skipped > 0 ? `, ${t("import.resultSkipped", { count: result.skipped })}` : ""}.
          </Text>
          <View className="mt-4 w-full" style={{ gap: 8 }}>
            <Button label={t("import.goCatalog")} onPress={() => router.back()} />
            <Pressable onPress={reset} className="items-center p-2">
              <Text className="text-sm text-muted">{t("import.importMore")}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <UpgradeSheet
        visible={!!planLimitError}
        onClose={() => setPlanLimitError(null)}
        limitKey={planLimitError?.key ?? null}
        limit={planLimitError?.limit}
      />
    </SafeAreaView>
  );
}
