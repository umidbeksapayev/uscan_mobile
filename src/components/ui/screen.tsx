import type { ReactNode } from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { useColors } from "@/theme/theme-store";
import { text } from "@/theme/tokens";

/**
 * Ekran header'i — orqaga tugmasi + sarlavha (+ ixtiyoriy o'ng tomon).
 *
 * Bu naqsh 15 ta ekranda qo'lda takrorlangan edi va har birida biroz
 * boshqacha: orqaga ikonkasi 20/24/26 (uch xil), tugma goh 40×40 bo'sh,
 * goh 36×36 chegarali, goh umuman o'ramsiz; sarlavha `text-xl semibold ink`
 * yoki `text-2xl medium heading`; a11y yorlig'i esa goh `common.back`,
 * goh `common.close` ("Yopish") edi — ya'ni ekran o'quvchi bir xil tugmani
 * turlicha e'lon qilardi.
 *
 * Farqlar ATAYLAB emas, tasodifiy edi. Shu sabab bu yerda bitta kanonik
 * shakl belgilanadi; ekranga xos qism faqat `title` va `right`.
 */
export function ScreenHeader({
  title,
  right,
  onBack,
  bordered = true,
}: {
  title: string;
  /** O'ng tomondagi harakatlar (ulashish, davr tanlash va h.k.). */
  right?: ReactNode;
  /** Standart `router.back()` o'rniga boshqa harakat kerak bo'lsa. */
  onBack?: () => void;
  /** Pastki chegara. Sarlavha ostidan darhol ro'yxat kelsa foydali. */
  bordered?: boolean;
}) {
  const colors = useColors();
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <View
      className="flex-row items-center gap-2 px-3 py-2"
      style={
        bordered
          ? { borderBottomWidth: 1, borderBottomColor: colors.line, backgroundColor: colors.surface }
          : undefined
      }
    >
      <Pressable
        onPress={onBack ?? (() => router.back())}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={t("common.back")}
        className="h-10 w-10 items-center justify-center"
      >
        <Ionicons name="chevron-back" size={24} color={colors.ink} />
      </Pressable>

      <Text
        accessibilityRole="header"
        numberOfLines={1}
        className="flex-1 font-semibold text-heading"
        style={{ fontSize: text.xl }}
      >
        {title}
      </Text>

      {right}
    </View>
  );
}

/*
 * `SafeAreaView` qobig'i ATAYIN bu yerga olinmadi. Har ekranda
 * `<SafeAreaView className="flex-1 bg-bg" edges={["top"]}>` takrorlanadi va
 * uni ham bitta `Screen` komponentiga yig'ish mumkin edi — lekin bu JSX
 * daraxtini o'zgartirishni talab qiladi (o'rash), ya'ni header almashtirishga
 * qaraganda ancha qaltis. Header o'zgarishi qurilmada tasdiqlangach, 4-bosqichda
 * (ekranlarni ko'chirish) qo'shiladi. Ishlatilmaydigan komponentni oldindan
 * yozib qo'yish — o'lik kod.
 */
