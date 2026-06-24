import { View, Text, TextInput, type TextInputProps } from "react-native";

import { colors } from "@/theme/colors";

type Props = TextInputProps & { label: string };

export function Field({ label, ...rest }: Props) {
  return (
    <View style={{ gap: 6 }}>
      <Text className="text-sm font-medium text-ink">{label}</Text>
      <TextInput
        placeholderTextColor={colors.tabInactive}
        className="rounded-2xl border border-line bg-surface px-4 text-base text-ink"
        style={{ height: 52 }}
        {...rest}
      />
    </View>
  );
}
