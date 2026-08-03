import React, { useCallback, useEffect, useRef } from "react";
import { StyleSheet, Pressable, type StyleProp, type ViewStyle } from "react-native";
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetView } from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/theme/theme-store";

/* ─────────────────────────────────────────────────────────────────────────
   SheetPressable — BottomSheet ichidagi tugmalar uchun maxsus komponent.
   
   NativeWind className (h-14, flex-1, bg-primary, etc.) uslublarini to'liq 
   qo'llab-quvvatlaydi hamda bosilganda vizual feedback (opacity) beradi.
   ───────────────────────────────────────────────────────────────────────── */

type SheetPressableProps = {
  onPress?: () => void;
  disabled?: boolean;
  hitSlop?: number | { top?: number; bottom?: number; left?: number; right?: number };
  activeOpacity?: number;
  style?: StyleProp<ViewStyle>;
  className?: string;
  children?: React.ReactNode;
};

export function SheetPressable({
  onPress,
  disabled,
  hitSlop,
  activeOpacity = 0.7,
  style,
  className,
  children,
}: SheetPressableProps) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      hitSlop={hitSlop}
      style={({ pressed }) => [
        style as ViewStyle,
        pressed && !disabled ? { opacity: activeOpacity } : null,
      ]}
      className={className}
    >
      {children}
    </Pressable>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   BottomSheet — umumiy wrapper komponent
   ───────────────────────────────────────────────────────────────────────── */

type Props = {
  visible: boolean;
  onClose: () => void;
  dismissOnBackdrop?: boolean;
  keyboardAvoiding?: boolean;
  handle?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  snapPoints?: Array<string | number>;
  enableDynamicSizing?: boolean;
};

export function BottomSheet({
  visible,
  onClose,
  dismissOnBackdrop = true,
  keyboardAvoiding = false,
  handle = true,
  contentStyle,
  children,
  snapPoints,
  enableDynamicSizing = true,
}: Props) {
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  const insets = useSafeAreaInsets();
  const colors = useColors();

  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        bottomSheetModalRef.current?.present();
      }, 10);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  const handleSheetChanges = useCallback(
    (index: number) => {
      if (index === -1) {
        onClose();
      }
    },
    [onClose]
  );

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        pressBehavior={dismissOnBackdrop ? "close" : "none"}
      />
    ),
    [dismissOnBackdrop]
  );

  if (!visible) return null;

  return (
    <BottomSheetModal
      ref={bottomSheetModalRef}
      index={0}
      snapPoints={snapPoints}
      enableDynamicSizing={enableDynamicSizing}
      onChange={handleSheetChanges}
      backdropComponent={renderBackdrop}
      keyboardBehavior={keyboardAvoiding ? "interactive" : "extend"}
      keyboardBlurBehavior="restore"
      stackBehavior="replace"
      enableContentPanningGesture={false}
      handleIndicatorStyle={handle ? { backgroundColor: colors.line } : { display: "none" }}
      backgroundStyle={{ backgroundColor: colors.surface, borderRadius: 24 }}
      bottomInset={0}
    >
      <BottomSheetView style={[styles.container, { paddingBottom: Math.max(insets.bottom, 16) }, contentStyle]}>
        {children}
      </BottomSheetView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
});
