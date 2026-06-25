import { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useRouter, useLocalSearchParams } from "expo-router";

import { colors } from "@/theme/colors";
import { useActiveShopId } from "@/features/auth/use-memberships";
import { useCustomer, useCreateCustomer, useUpdateCustomer } from "@/features/customers/use-customers";

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "phone-pad";
}) {
  return (
    <View className="mb-4">
      <Text className="mb-1.5 text-sm font-medium text-ink">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.tabInactive}
        keyboardType={keyboardType ?? "default"}
        className="rounded-2xl border border-line bg-surface px-4 text-base text-ink"
        style={{ height: 52 }}
      />
    </View>
  );
}

export default function CustomerFormScreen() {
  const router = useRouter();
  const shopId = useActiveShopId();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = !!id;

  const { data: existing } = useCustomer(id);
  const createMut = useCreateCustomer();
  const updateMut = useUpdateCustomer();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setPhone(existing.phone ?? "");
      setNote(existing.note ?? "");
    }
  }, [existing]);

  const pending = createMut.isPending || updateMut.isPending;
  const canSave = name.trim().length > 0 && !!shopId && !pending;

  async function onSave() {
    if (!canSave) return;
    try {
      if (editing && id) {
        await updateMut.mutateAsync({ id, fields: { name, phone, note } });
      } else {
        await createMut.mutateAsync({ shop_id: shopId!, name, phone, note });
      }
      router.back();
    } catch (e) {
      Alert.alert("Xatolik", e instanceof Error ? e.message : "Saqlab bo'lmadi");
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <View className="flex-row items-center gap-2 px-3 py-2">
        <Pressable onPress={() => router.back()} hitSlop={8} className="h-10 w-10 items-center justify-center">
          <Ionicons name="chevron-back" size={26} color={colors.ink} />
        </Pressable>
        <Text className="text-xl font-semibold text-ink">
          {editing ? "Mijozni tahrirlash" : "Yangi mijoz"}
        </Text>
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        extraScrollHeight={24}
      >
        <Field label="Ism *" value={name} onChangeText={setName} placeholder="Mijoz ismi" />
        <Field
          label="Telefon"
          value={phone}
          onChangeText={setPhone}
          placeholder="+998 90 123 45 67"
          keyboardType="phone-pad"
        />
        <Field label="Izoh" value={note} onChangeText={setNote} placeholder="Ixtiyoriy" />

        <Pressable
          disabled={!canSave}
          onPress={onSave}
          className="mt-2 flex-row items-center justify-center rounded-2xl bg-primary"
          style={{ height: 54, opacity: canSave ? 1 : 0.5 }}
        >
          {pending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-base font-semibold text-white">Saqlash</Text>
          )}
        </Pressable>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}
