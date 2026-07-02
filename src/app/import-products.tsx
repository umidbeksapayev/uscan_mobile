import { useState } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator, FlatList } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";

import { colors } from "@/theme/colors";
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

type Status = "idle" | "loading" | "preview" | "importing" | "done";

const STATUS_BADGE: Record<ImportRowStatus, { bg: string; text: string; label: string }> = {
  valid: { bg: "#E7F6EE", text: "#0F6E56", label: "Yaroqli" },
  error: { bg: "#FDECEC", text: "#B42318", label: "Xato" },
  duplicate: { bg: "#FCF1DD", text: "#92600A", label: "Dublikat" },
};

const ERROR_LABELS: Record<string, string> = {
  name_required: "Nomi yo'q",
  invalid_type: "Tur noto'g'ri (dona/kg)",
  invalid_cost: "Tan narx noto'g'ri",
  invalid_selling: "Sotuv narx noto'g'ri",
  invalid_quantity: "Miqdor noto'g'ri",
  unit_not_integer: "DONALI miqdor butun son bo'lishi kerak",
};

function RequiredHeaderHint() {
  return (
    <View className="rounded-2xl border border-line bg-surface p-4" style={{ gap: 6 }}>
      <Text className="text-sm font-medium text-ink">Kerakli ustunlar (CSV, 1-qator sarlavha)</Text>
      <Text className="text-xs text-muted">
        <Text style={{ fontWeight: "500" }}>Nomi*</Text>, Tur (dona/kg),{" "}
        <Text style={{ fontWeight: "500" }}>Tan narxi*</Text>,{" "}
        <Text style={{ fontWeight: "500" }}>Sotuv narxi*</Text>,{" "}
        <Text style={{ fontWeight: "500" }}>Miqdor*</Text>, Barcode, Kategoriya
      </Text>
      <Text className="text-xs text-muted">
        * — majburiy. Tur bo'sh bo'lsa DONALI deb olinadi. Sarlavha o'zbek, rus yoki
        inglizcha bo'lishi mumkin.
      </Text>
    </View>
  );
}

function PreviewRowItem({ row }: { row: ImportPreviewRow }) {
  const badge = STATUS_BADGE[row.status];
  return (
    <View
      className="mb-2 rounded-2xl border border-line bg-surface p-3"
      style={{ gap: 4 }}
    >
      <View className="flex-row items-center justify-between">
        <Text className="flex-1 text-sm font-medium text-ink" numberOfLines={1}>
          {row.name || `#${row.rowNumber}-qator`}
        </Text>
        <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: badge.bg }}>
          <Text style={{ fontSize: 11, fontWeight: "500", color: badge.text }}>{badge.label}</Text>
        </View>
      </View>
      {row.status === "error" ? (
        <Text className="text-xs" style={{ color: colors.danger }}>
          {row.errors.map((e) => ERROR_LABELS[e] ?? e).join(", ")}
        </Text>
      ) : (
        <Text className="text-xs text-muted">
          {row.saleType === "weight" ? "VAZN" : "DONALI"} · {row.quantity} ·{" "}
          {row.sellingPrice.toLocaleString("ru-RU")} so'm
          {row.category ? ` · ${row.category}` : ""}
        </Text>
      )}
    </View>
  );
}

export default function ImportProductsScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const shopId = useActiveShopId();
  const { canManageProducts } = useActivePermissions();

  const [status, setStatus] = useState<Status>("idle");
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!canManageProducts) {
    return (
      <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
        <View className="flex-row items-center gap-2 px-3 py-2">
          <Pressable onPress={() => router.back()} hitSlop={8} className="h-10 w-10 items-center justify-center">
            <Ionicons name="chevron-back" size={26} color={colors.ink} />
          </Pressable>
          <Text className="text-xl font-semibold text-ink">Import</Text>
        </View>
        <View className="flex-1 items-center justify-center px-10" style={{ gap: 8 }}>
          <Ionicons name="lock-closed" size={36} color={colors.muted} />
          <Text className="text-center text-sm text-muted">
            Mahsulot import qilish faqat egasi yoki "Mahsulotlar" ruxsati bor xodimga ko'rinadi.
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
    const picked = await DocumentPicker.getDocumentAsync({ type: "*/*", copyToCacheDirectory: true });
    if (picked.canceled || !picked.assets?.[0]) return;
    const asset = picked.assets[0];
    if (!/\.csv$/i.test(asset.name)) {
      setErrorMsg("Faqat .csv fayl qo'llab-quvvatlanadi.");
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
      setErrorMsg(e instanceof Error ? e.message : "Faylni o'qib bo'lmadi");
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
      toast.error("Import xatosi", e instanceof Error ? e.message : "Import qilib bo'lmadi");
      setStatus("preview");
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <View className="flex-row items-center gap-2 px-3 py-2">
        <Pressable onPress={() => router.back()} hitSlop={8} className="h-10 w-10 items-center justify-center">
          <Ionicons name="chevron-back" size={26} color={colors.ink} />
        </Pressable>
        <Text className="text-xl font-semibold text-ink">Mahsulot import qilish</Text>
      </View>

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
            <Text className="text-base font-medium text-white">CSV fayl tanlash</Text>
          </Pressable>
        </ScrollView>
      ) : status === "loading" ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
          <Text className="mt-3 text-sm text-muted">Fayl o'qilmoqda...</Text>
        </View>
      ) : status === "preview" && preview ? (
        preview.headerError ? (
          <View className="flex-1 items-center justify-center px-10" style={{ gap: 12 }}>
            <Ionicons name="alert-circle-outline" size={36} color={colors.danger} />
            <Text className="text-center text-sm text-muted">
              "{fileName}" faylida majburiy ustunlar (Nomi, Tan narxi, Sotuv narxi, Miqdor)
              topilmadi. Sarlavha qatorini tekshiring.
            </Text>
            <Pressable onPress={reset} className="p-2">
              <Text className="text-sm font-medium text-primary">Boshqa fayl tanlash</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View className="px-4 pb-2">
              <Text className="text-sm text-muted" numberOfLines={1}>
                {fileName} · {preview.rows.length} qator
              </Text>
              <View className="mt-2 flex-row gap-2">
                <View className="flex-1 items-center rounded-xl bg-bg py-2">
                  <Text className="text-base font-medium" style={{ color: "#0F6E56" }}>
                    {preview.validCount}
                  </Text>
                  <Text className="text-xs text-muted">Yaroqli</Text>
                </View>
                <View className="flex-1 items-center rounded-xl bg-bg py-2">
                  <Text className="text-base font-medium" style={{ color: "#92600A" }}>
                    {preview.duplicateCount}
                  </Text>
                  <Text className="text-xs text-muted">Dublikat</Text>
                </View>
                <View className="flex-1 items-center rounded-xl bg-bg py-2">
                  <Text className="text-base font-medium text-danger">{preview.errorCount}</Text>
                  <Text className="text-xs text-muted">Xato</Text>
                </View>
              </View>
            </View>
            <FlatList
              data={preview.rows}
              keyExtractor={(r) => String(r.rowNumber)}
              renderItem={({ item }) => <PreviewRowItem row={item} />}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
            />
            <View className="border-t border-line bg-surface px-4 pt-3" style={{ paddingBottom: 14, gap: 8 }}>
              <Button
                label={`${preview.validCount} ta mahsulotni import qilish`}
                onPress={onImport}
                disabled={preview.validCount === 0}
              />
              <Pressable onPress={reset} className="items-center p-2">
                <Text className="text-sm text-muted">Boshqa fayl tanlash</Text>
              </Pressable>
            </View>
          </>
        )
      ) : status === "importing" ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
          <Text className="mt-3 text-sm text-muted">Import qilinmoqda...</Text>
        </View>
      ) : status === "done" && result ? (
        <View className="flex-1 items-center justify-center px-10" style={{ gap: 8 }}>
          <View
            className="mb-2 h-20 w-20 items-center justify-center rounded-full"
            style={{ backgroundColor: "#E7F6EE" }}
          >
            <Ionicons name="checkmark" size={40} color={colors.success} />
          </View>
          <Text className="text-center text-xl font-medium text-ink">Import yakunlandi</Text>
          <Text className="text-center text-sm text-muted">
            {result.inserted} ta mahsulot qo'shildi
            {result.categories_created > 0 ? `, ${result.categories_created} ta yangi kategoriya` : ""}
            {result.skipped > 0 ? `, ${result.skipped} ta qator o'tkazib yuborildi` : ""}.
          </Text>
          <View className="mt-4 w-full" style={{ gap: 8 }}>
            <Button label="Katalogga o'tish" onPress={() => router.back()} />
            <Pressable onPress={reset} className="items-center p-2">
              <Text className="text-sm text-muted">Yana fayl import qilish</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}
