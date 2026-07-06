import { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { useTranslation } from "react-i18next";

import { colors } from "@/theme/colors";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { formatCurrency, formatWeight, formatNumber } from "@/lib/format";
import { kgFromAmount, amountFromKg } from "./weight-math";
import type { Product } from "@/types/database";

type Mode = "som" | "kg";
const SOM_PRESETS = [10000, 20000, 50000];
const KG_PRESETS = [0.5, 1, 2];

type Props = {
  product: Product | null;
  initialKg?: number;
  onClose: () => void;
  onConfirm: (kg: number) => void;
};

/**
 * VAZN tezkor oynasi: Summa (so'm) YOKI Vazn (kg) — bittasini tanlab kiritasiz,
 * ikkinchisi avtomatik ko'rsatiladi. Mijoz "20 000 so'mlik" desa → Summa rejimi.
 */
export function WeightSheet({ product, initialKg, onClose, onConfirm }: Props) {
  const { t } = useTranslation();
  const price = product?.selling_price ?? 0;
  const [mode, setMode] = useState<Mode>("som");
  const [text, setText] = useState("");

  useEffect(() => {
    if (product) {
      if (initialKg && initialKg > 0) {
        setMode("kg");
        setText(String(initialKg));
      } else {
        setMode("som");
        setText("");
      }
    }
  }, [product, initialKg]);

  const raw = parseFloat(text.replace(/\s/g, "").replace(",", ".")) || 0;
  const kg = mode === "kg" ? raw : kgFromAmount(raw, price);
  const finalKg = Math.round(kg * 1000) / 1000;
  const amount = amountFromKg(finalKg, price);
  const valid = finalKg > 0;

  function switchMode(next: Mode) {
    if (next === mode) return;
    setText(next === "kg" ? (finalKg ? String(finalKg) : "") : amount ? String(amount) : "");
    setMode(next);
  }

  const presets = mode === "som" ? SOM_PRESETS : KG_PRESETS;

  return (
    <BottomSheet visible={!!product} onClose={onClose} keyboardAvoiding>
          {product ? (
            <>
              <Text className="text-lg font-medium text-ink">{product.name}</Text>
              <Text className="text-sm text-muted">
                {formatCurrency(price)} / {t("common.kg")}
              </Text>

              {/* Rejim tanlash */}
              <View className="mb-4 mt-4 flex-row rounded-2xl bg-bg p-1">
                {(["som", "kg"] as Mode[]).map((m) => {
                  const active = mode === m;
                  return (
                    <Pressable
                      key={m}
                      onPress={() => switchMode(m)}
                      className="flex-1 items-center justify-center rounded-xl"
                      style={{ height: 44, backgroundColor: active ? colors.primary : "transparent" }}
                    >
                      <Text style={{ fontWeight: "500", color: active ? "#fff" : colors.muted }}>
                        {m === "som" ? t("sell.somMode") : t("sell.kgMode")}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Bitta input */}
              <TextInput
                value={text}
                onChangeText={setText}
                keyboardType={mode === "som" ? "number-pad" : "decimal-pad"}
                placeholder={t("common.example", { v: mode === "som" ? "20000" : "1.5" })}
                placeholderTextColor={colors.tabInactive}
                autoFocus
                className="rounded-2xl border border-line bg-bg px-4 text-2xl font-medium text-ink"
                style={{ height: 60 }}
              />

              {/* Ekvivalent (faqat ko'rsatish) */}
              <Text className="mt-2 text-sm" style={{ color: valid ? colors.muted : "transparent" }}>
                {mode === "som"
                  ? `≈ ${formatWeight(finalKg)}`
                  : `= ${formatCurrency(amount)}`}
              </Text>

              {/* Tezkor tugmalar */}
              <View className="mt-3 flex-row gap-2">
                {presets.map((p) => (
                  <Pressable
                    key={p}
                    onPress={() => setText(String(p))}
                    className="flex-1 items-center justify-center rounded-xl bg-bg"
                    style={{ height: 44 }}
                  >
                    <Text className="text-sm font-medium text-ink">
                      {mode === "som" ? formatNumber(p) : `${p.toFixed(1)} ${t("common.kg")}`}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Tasdiqlash */}
              <Pressable
                disabled={!valid}
                onPress={() => onConfirm(finalKg)}
                className="mt-6 flex-row items-center justify-center rounded-2xl bg-primary"
                style={{ height: 54, opacity: valid ? 1 : 0.5 }}
              >
                <Text className="text-base font-medium text-white">
                  {t("addToCart.addToCart")}
                  {valid ? ` · ${formatCurrency(amount)}` : ""}
                </Text>
              </Pressable>
            </>
          ) : null}
    </BottomSheet>
  );
}
