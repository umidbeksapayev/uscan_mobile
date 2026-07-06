import { useEffect, useState } from "react";
import { Text, TextInput, Pressable, ActivityIndicator } from "react-native";
import { toast } from "@/lib/toast";
import { useTranslation } from "react-i18next";

import { colors } from "@/theme/colors";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import type { Supplier } from "@/types/database";
import { useCreateSupplier, useUpdateSupplier } from "./use-suppliers";

type Props = {
  visible: boolean;
  shopId: string;
  /** Tahrir uchun — mavjud ta'minotchi; yangi uchun null. */
  supplier?: Supplier | null;
  onClose: () => void;
};

export function SupplierFormSheet({ visible, shopId, supplier, onClose }: Props) {
  const { t } = useTranslation();
  const createMut = useCreateSupplier();
  const updateMut = useUpdateSupplier();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (visible) {
      setName(supplier?.name ?? "");
      setPhone(supplier?.phone ?? "");
      setNote(supplier?.note ?? "");
      createMut.reset();
      updateMut.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, supplier?.id]);

  const pending = createMut.isPending || updateMut.isPending;
  const canSave = name.trim().length > 0 && !pending;

  async function onSave() {
    if (!canSave) return;
    try {
      if (supplier) {
        await updateMut.mutateAsync({ id: supplier.id, fields: { name, phone, note } });
      } else {
        await createMut.mutateAsync({ shop_id: shopId, name, phone, note });
      }
      onClose();
    } catch (e) {
      toast.error(t("common.error"), e instanceof Error ? e.message : t("common.saveFailed"));
    }
  }

  const input = {
    height: 50,
  } as const;

  return (
    <BottomSheet visible={visible} onClose={onClose} keyboardAvoiding contentStyle={{ gap: 10 }}>
          <Text className="mb-1 text-lg font-medium text-ink">
            {supplier ? t("suppliers.editTitle") : t("suppliers.newSupplier")}
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={`${t("suppliers.name")} *`}
            placeholderTextColor={colors.tabInactive}
            className="rounded-2xl border border-line bg-bg px-4 text-base text-ink"
            style={input}
            autoFocus
          />
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder={`${t("suppliers.phone")} (${t("common.optional").toLowerCase()})`}
            placeholderTextColor={colors.tabInactive}
            keyboardType="phone-pad"
            className="rounded-2xl border border-line bg-bg px-4 text-base text-ink"
            style={input}
          />
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder={`${t("suppliers.note")} (${t("common.optional").toLowerCase()})`}
            placeholderTextColor={colors.tabInactive}
            className="rounded-2xl border border-line bg-bg px-4 text-base text-ink"
            style={input}
          />
          <Pressable
            disabled={!canSave}
            onPress={onSave}
            className="mt-2 flex-row items-center justify-center rounded-2xl"
            style={{ height: 52, backgroundColor: colors.kirim, opacity: canSave ? 1 : 0.5 }}
          >
            {pending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-base font-semibold text-white">{t("common.save")}</Text>
            )}
          </Pressable>
    </BottomSheet>
  );
}
