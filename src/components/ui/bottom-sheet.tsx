import {
  Modal,
  View,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { colors } from "@/theme/colors";

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Backdrop bosilganda yopish (default true) — masalan, success fazada o'chiriladi. */
  dismissOnBackdrop?: boolean;
  /** Input bor sheet'lar uchun: klaviatura ochilganda sheet ko'tariladi. */
  keyboardAvoiding?: boolean;
  /** Tepadagi sudrash chizig'i (default true). */
  handle?: boolean;
  /** Sheet ichki style qo'shimchasi (gap, alignItems kabi farqlar uchun). */
  contentStyle?: StyleProp<ViewStyle>;
  children: React.ReactNode;
};

/**
 * Pastdan chiqadigan umumiy oyna (audit A2) — avval 15 faylda takrorlangan
 * Modal boilerplate: qoraytirilgan backdrop (bosilsa yopiladi), pastga
 * yopishgan oq kartochka (tepa burchaklari 24), sudrash chizig'i.
 * Android orqaga tugmasi (`onRequestClose`) har doim yopadi.
 */
export function BottomSheet({
  visible,
  onClose,
  dismissOnBackdrop = true,
  keyboardAvoiding = false,
  handle = true,
  contentStyle,
  children,
}: Props) {
  const body = (
    <Pressable
      onPress={dismissOnBackdrop ? onClose : undefined}
      style={{ flex: 1, backgroundColor: "rgba(15,23,42,0.45)", justifyContent: "flex-end" }}
    >
      <View
        onStartShouldSetResponder={() => true}
        style={[
          {
            backgroundColor: colors.surface,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 20,
            paddingBottom: 28,
          },
          contentStyle,
        ]}
      >
        {handle ? (
          <View
            style={{
              alignSelf: "center",
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: colors.line,
              marginBottom: 12,
            }}
          />
        ) : null}
        {children}
      </View>
    </Pressable>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {keyboardAvoiding ? (
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          {body}
        </KeyboardAvoidingView>
      ) : (
        body
      )}
    </Modal>
  );
}
