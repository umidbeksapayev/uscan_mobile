import { useEffect, useState } from "react";
import { Modal, View, Text, TextInput, Pressable } from "react-native";

import { colors } from "@/theme/colors";
import { formatCurrency } from "@/lib/format";
import { kgFromAmount, amountFromKg } from "./weight-math";
import type { Product } from "@/types/database";

const PRESETS = [0.5, 1, 2];

type Props = {
  product: Product | null;
  initialKg?: number;
  onClose: () => void;
  onConfirm: (kg: number) => void;
};

/** VAZN mahsulot uchun tezkor oyna: so'm ⇄ kg ikki tomonlama. */
export function WeightSheet({ product, initialKg, onClose, onConfirm }: Props) {
  const price = product?.selling_price ?? 0;
  const [kgText, setKgText] = useState("");
  const [somText, setSomText] = useState("");

  useEffect(() => {
    if (product) {
      const kg = initialKg ?? 0;
      setKgText(kg ? String(kg) : "");
      setSomText(kg ? String(amountFromKg(kg, price)) : "");
    }
  }, [product, initialKg, price]);

  function onKg(t: string) {
    setKgText(t);
    const kg = parseFloat(t.replace(",", "."));
    setSomText(!Number.isNaN(kg) && kg > 0 ? String(amountFromKg(kg, price)) : "");
  }
  function onSom(t: string) {
    setSomText(t);
    const som = parseFloat(t.replace(",", "."));
    setKgText(!Number.isNaN(som) && som > 0 ? String(kgFromAmount(som, price)) : "");
  }
  function preset(kg: number) {
    setKgText(String(kg));
    setSomText(String(amountFromKg(kg, price)));
  }

  const kg = parseFloat(kgText.replace(",", "."));
  const valid = !Number.isNaN(kg) && kg > 0;
  const finalKg = valid ? Math.round(kg * 1000) / 1000 : 0;

  return (
    <Modal visible={!!product} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{ flex: 1, backgroundColor: "rgba(15,23,42,0.45)", justifyContent: "flex-end" }}
      >
        <View
          onStartShouldSetResponder={() => true}
          style={{
            backgroundColor: colors.surface,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 20,
            paddingBottom: 32,
          }}
        >
          <View
            style={{
              alignSelf: "center",
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: colors.line,
              marginBottom: 16,
            }}
          />

          {product ? (
            <>
              <Text className="text-lg font-medium text-ink">{product.name}</Text>
              <Text className="mb-4 text-sm text-muted">{formatCurrency(price)} / kg</Text>

              <Text className="mb-1 text-sm font-medium text-ink">Summa (so'm)</Text>
              <TextInput
                value={somText}
                onChangeText={onSom}
                keyboardType="number-pad"
                placeholder="Masalan: 15000"
                placeholderTextColor={colors.tabInactive}
                className="mb-3 rounded-2xl border border-line bg-bg px-4 text-lg text-ink"
                style={{ height: 52 }}
              />

              <Text className="mb-1 text-sm font-medium text-ink">Vazn (kg)</Text>
              <TextInput
                value={kgText}
                onChangeText={onKg}
                keyboardType="decimal-pad"
                placeholder="Masalan: 1.5"
                placeholderTextColor={colors.tabInactive}
                className="mb-3 rounded-2xl border border-line bg-bg px-4 text-lg text-ink"
                style={{ height: 52 }}
              />

              <View className="mb-5 flex-row gap-2">
                {PRESETS.map((p) => (
                  <Pressable
                    key={p}
                    onPress={() => preset(p)}
                    className="flex-1 items-center justify-center rounded-xl bg-bg"
                    style={{ height: 44 }}
                  >
                    <Text className="text-sm font-medium text-ink">{p.toFixed(1)} kg</Text>
                  </Pressable>
                ))}
              </View>

              <Pressable
                disabled={!valid}
                onPress={() => onConfirm(finalKg)}
                className="flex-row items-center justify-center gap-2 rounded-2xl bg-primary"
                style={{ height: 54, opacity: valid ? 1 : 0.5 }}
              >
                <Text className="text-base font-medium text-white">
                  Savatga qo'shish{valid ? ` · ${formatCurrency(amountFromKg(finalKg, price))}` : ""}
                </Text>
              </Pressable>
            </>
          ) : null}
        </View>
      </Pressable>
    </Modal>
  );
}
