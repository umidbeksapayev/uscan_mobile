import { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { useColors } from "@/theme/theme-store";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { toast } from "@/lib/toast";
import { formatNumber } from "@/lib/format";
import { parseAmount } from "@/features/shift/shift-math";
import { EXPENSE_CATEGORIES, categoryLabel, type Expense } from "./expense-math";
import { useCreateExpense, useUpdateExpense, useDeleteExpense } from "./use-expenses";

/** Kategoriya ikonlari (UI qatlami — math faylida emas). */
const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  rent: "home-outline",
  utility: "flash-outline",
  salary: "people-outline",
  transport: "car-outline",
  other: "ellipsis-horizontal-outline",
};

export function categoryIcon(id: string): keyof typeof Ionicons.glyphMap {
  return CATEGORY_ICONS[id] ?? "ellipsis-horizontal-outline";
}

type Props = {
  visible: boolean;
  /** Tahrir uchun — mavjud xarajat; yangi uchun null. */
  expense?: Expense | null;
  onClose: () => void;
};

export function ExpenseFormSheet({ visible, expense, onClose }: Props) {
  const colors = useColors();

  const { t } = useTranslation();
  const createMut = useCreateExpense();
  const updateMut = useUpdateExpense();
  const deleteMut = useDeleteExpense();
  const [amountText, setAmountText] = useState("");
  const [category, setCategory] = useState<string>("other");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (visible) {
      setAmountText(expense ? String(expense.amount) : "");
      setCategory(expense?.category ?? "other");
      setNote(expense?.note ?? "");
      createMut.reset();
      updateMut.reset();
      deleteMut.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, expense?.id]);

  const amount = parseAmount(amountText);
  const pending = createMut.isPending || updateMut.isPending || deleteMut.isPending;
  const canSave = amount > 0 && !pending;

  async function onSave() {
    if (!canSave) return;
    try {
      if (expense) {
        await updateMut.mutateAsync({ id: expense.id, amount, category, note });
      } else {
        await createMut.mutateAsync({ amount, category, note });
      }
      onClose();
    } catch (e) {
      toast.error(t("expenses.saveErrorTitle", "Xatolik"), e instanceof Error ? e.message : t("expenses.saveErrorBody", "Saqlab bo'lmadi"));
    }
  }

  function onDelete() {
    if (!expense) return;
    Alert.alert(
      t("expenses.deleteTitle", "Xarajatni o'chirish"),
      t("expenses.deleteBody", "Rostdan ham o'chirilsinmi?"),
      [
        { text: t("common.cancel", "Bekor qilish"), style: "cancel" },
        {
          text: t("expenses.deleteBtn", "O'chirish"),
          style: "destructive",
          onPress: async () => {
            try {
              await deleteMut.mutateAsync(expense.id);
              onClose();
            } catch (e) {
              toast.error(t("expenses.saveErrorTitle", "Xatolik"), e instanceof Error ? e.message : t("expenses.deleteErrorBody", "O'chirib bo'lmadi"));
            }
          },
        },
      ],
    );
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} keyboardAvoiding contentStyle={{ gap: 10 }}>
          <Text className="mb-1 text-lg font-medium text-ink">
            {expense ? t("expenses.editTitle", "Xarajatni tahrirlash") : t("expenses.addTitle", "Yangi xarajat")}
          </Text>

          <TextInput
            value={amountText}
            onChangeText={setAmountText}
            keyboardType="number-pad"
            placeholder={t("expenses.amountPlaceholder", "Summa, masalan {{sample}}", { sample: formatNumber(500000) })}
            placeholderTextColor={colors.tabInactive}
            accessibilityLabel={t("expenses.amountA11y", "Xarajat summasi")}
            className="rounded-2xl border border-line bg-bg px-4 text-xl font-medium text-ink"
            style={{ height: 56 }}
            autoFocus={!expense}
          />

          {/* Kategoriya chiplari */}
          <View className="flex-row flex-wrap" style={{ gap: 8 }}>
            {EXPENSE_CATEGORIES.map((c) => {
              const active = category === c.id;
              const catLabel = categoryLabel(c.id, t);
              return (
                <Pressable
                  key={c.id}
                  onPress={() => setCategory(c.id)}
                  accessibilityLabel={t("expenses.catA11y", "Kategoriya: {{label}}", { label: catLabel })}
                  className="flex-row items-center rounded-full px-3 py-2"
                  style={{
                    gap: 5,
                    backgroundColor: active ? colors.primary : colors.bg,
                    borderWidth: 1,
                    borderColor: active ? colors.primary : colors.line,
                  }}
                >
                  <Ionicons name={categoryIcon(c.id)} size={15} color={active ? "#fff" : colors.muted} />
                  <Text style={{ fontSize: 13, fontWeight: "500", color: active ? "#fff" : colors.muted }}>
                    {catLabel}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder={t("expenses.notePlaceholder", "Izoh (ixtiyoriy)")}
            placeholderTextColor={colors.tabInactive}
            accessibilityLabel={t("expenses.noteA11y", "Xarajat izohi")}
            className="rounded-2xl border border-line bg-bg px-4 text-base text-ink"
            style={{ height: 50 }}
          />

          <Pressable
            disabled={!canSave}
            onPress={onSave}
            accessibilityLabel={t("expenses.saveBtn", "Saqlash")}
            className="mt-2 flex-row items-center justify-center rounded-2xl bg-primary"
            style={{ height: 52, opacity: canSave ? 1 : 0.5 }}
          >
            {pending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-base font-semibold text-white">{t("expenses.saveBtn", "Saqlash")}</Text>
            )}
          </Pressable>

          {expense ? (
            <Pressable
              disabled={pending}
              onPress={onDelete}
              accessibilityLabel={t("expenses.deleteBtn", "O'chirish")}
              className="flex-row items-center justify-center gap-2 rounded-2xl"
              style={{ height: 48 }}
            >
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
              <Text className="text-base font-medium text-danger">{t("expenses.deleteBtn", "O'chirish")}</Text>
            </Pressable>
          ) : null}
    </BottomSheet>
  );
}
