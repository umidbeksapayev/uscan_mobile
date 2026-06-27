import { Pressable, Text, ActivityIndicator } from "react-native";

import { colors } from "@/theme/colors";

type Props = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "ghost";
  /** E2E (Maestro) selektori uchun. */
  testID?: string;
};

export function Button({ label, onPress, loading, disabled, variant = "primary", testID }: Props) {
  const isPrimary = variant === "primary";
  const blocked = disabled || loading;

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={blocked}
      className={`flex-row items-center justify-center rounded-2xl ${isPrimary ? "bg-primary" : "bg-transparent"}`}
      style={{ height: 52, opacity: blocked ? 0.6 : 1 }}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? "#fff" : colors.primary} />
      ) : (
        <Text className={`text-base font-medium ${isPrimary ? "text-white" : "text-primary"}`}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}
