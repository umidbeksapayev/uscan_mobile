import * as React from "react";
import { View, Text, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { colors } from "@/theme/colors";
import { Button } from "@/components/ui/button";

type Props = { children: React.ReactNode; onReset?: () => void };
type State = { error: Error | null };

/**
 * Render paytidagi xatoni ushlaydi — aks holda bitta komponent throw qilsa butun
 * ilova OQ EKRAN bilan qulaydi. Fallback'da "Qayta urinish" tugmasi xato holatini
 * tozalaydi (ixtiyoriy `onReset` bilan tashqi tiklash, masalan query cache).
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.error("ErrorBoundary:", error, info.componentStack);
    }
  }

  reset = () => {
    this.setState({ error: null });
    this.props.onReset?.();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <View className="flex-1 items-center justify-center bg-bg px-6">
        <View
          className="h-16 w-16 items-center justify-center rounded-full"
          style={{ backgroundColor: "#FEE2E2" }}
        >
          <Ionicons name="alert-circle-outline" size={36} color={colors.danger} />
        </View>
        <Text className="mt-4 text-lg font-semibold text-ink">Xatolik yuz berdi</Text>
        <Text className="mt-1 text-center text-sm text-muted">
          Ilovada kutilmagan xato. Qayta urinib ko'ring.
        </Text>
        <ScrollView
          className="mt-4 max-h-32 w-full rounded-xl"
          style={{ backgroundColor: colors.surface, borderWidth: 0.5, borderColor: colors.line }}
        >
          <Text className="p-3 text-xs text-muted">{error.message}</Text>
        </ScrollView>
        <View className="mt-5 w-full">
          <Button label="Qayta urinish" onPress={this.reset} />
        </View>
      </View>
    );
  }
}
