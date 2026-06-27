import { useEffect, useState } from "react";
import { Modal, View, Text, TextInput, Pressable, ActivityIndicator } from "react-native";
import { toast } from "@/lib/toast";

import { colors } from "@/theme/colors";
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
      toast.error("Xatolik", e instanceof Error ? e.message : "Saqlab bo'lmadi");
    }
  }

  const input = {
    height: 50,
  } as const;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
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
            paddingBottom: 28,
            gap: 10,
          }}
        >
          <View style={{ alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: colors.line, marginBottom: 8 }} />
          <Text className="mb-1 text-lg font-medium text-ink">
            {supplier ? "Ta'minotchini tahrirlash" : "Yangi ta'minotchi"}
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Nomi *"
            placeholderTextColor={colors.tabInactive}
            className="rounded-2xl border border-line bg-bg px-4 text-base text-ink"
            style={input}
            autoFocus
          />
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="Telefon (ixtiyoriy)"
            placeholderTextColor={colors.tabInactive}
            keyboardType="phone-pad"
            className="rounded-2xl border border-line bg-bg px-4 text-base text-ink"
            style={input}
          />
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Izoh (ixtiyoriy)"
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
              <Text className="text-base font-semibold text-white">Saqlash</Text>
            )}
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}
