import { useCallback, useEffect, useRef, useState, memo } from "react";
import { View, Text, TextInput, Pressable, FlatList, ScrollView, Alert } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { toast } from "@/lib/toast";
import { useColors } from "@/theme/theme-store";
import { formatCurrency, formatWeight } from "@/lib/format";
import { useDebounce } from "@/lib/use-debounce";
import { useActiveShopId, useActivePermissions } from "@/features/auth/use-memberships";
import { searchSellProducts } from "@/features/sell/lookup";
import { useFrequentProducts } from "@/features/sell/use-frequent-products";
import { useCart, type CartItem } from "@/features/sell/cart-store";
import { cartTotal } from "@/features/sell/cart-total";
import { WeightSheet } from "@/features/sell/weight-sheet";
import { PaymentSheet } from "@/features/sell/payment-sheet";
import { QuickPriceSheet } from "@/features/sell/quick-price-sheet";
import { priceMiscProduct, isMiscProduct } from "@/features/sell/misc-product";
import { tabularNums } from "@/theme/typography";
import type { Product } from "@/types/database";
import { radius, text } from "@/theme/tokens";
import { PressableScale } from "@/components/ui/pressable-scale";
import { useScanDetect, type ScanDetect } from "@/features/scanner/use-scan-detect";
import { useScanHandler } from "@/features/scanner/use-scan-handler";

const FrequentTile = memo(function FrequentTile({
  product,
  onPress,
}: {
  product: Product;
  onPress: () => void;
}) {
  const colors = useColors();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      // Ekran o'quvchi nom va narxni alohida ikki element qilib emas, bitta
      // tugma sifatida o'qiydi.
      accessibilityLabel={`${product.name}, ${formatCurrency(product.selling_price)}`}
      className="items-center rounded-2xl border border-line bg-surface p-2"
      style={{ width: 80 }}
    >
      {product.image_url ? (
        <Image
          source={{ uri: product.image_url }}
          style={{ width: 40, height: 40, borderRadius: radius.md }}
          contentFit="cover"
        />
      ) : (
        <View className="h-10 w-10 items-center justify-center rounded-xl bg-primary-tint">
          <Ionicons name="cube-outline" size={20} color={colors.primary} />
        </View>
      )}
      <Text className="mt-1.5 text-center text-xs text-ink" numberOfLines={1}>
        {product.name}
      </Text>
      <Text className="text-center text-xs font-medium text-heading">
        {formatCurrency(product.selling_price)}
      </Text>
    </Pressable>
  );
});

type CartRowProps = { item: CartItem; onEditWeight: (item: CartItem) => void };

const CartRow = memo(function CartRow({ item, onEditWeight }: CartRowProps) {
  const colors = useColors();

  const { t } = useTranslation();
  const increment = useCart((s) => s.increment);
  const decrement = useCart((s) => s.decrement);
  const remove = useCart((s) => s.remove);

  const isWeight = item.product.sale_type === "weight";
  const accent = isWeight ? colors.successInk : colors.primary;
  const lineTotal = cartTotal([item]);

  return (
    /*
      Ixcham 2-qatorli karta (~82px). Ilgari 4 qatorli edi (~177px) va bitta
      mahsulot ekranning yarmini egallardi — 2-3 mahsulotni ko'rish uchun ham
      varaqlash kerak bo'lardi.

      Olib tashlandi: "DONALI/VAZNLI" yorlig'i (birlik narxi qatorida "/ dona"
      yoki "/ kg" allaqachon yozilgan — takror ma'lumot edi) va ajratuvchi
      chiziq. Tur farqi summa rangida saqlanib qoldi (ko'k = dona, yashil = kg).
    */
    <View className="mb-2 rounded-2xl border border-line bg-surface px-3 py-2.5">
      {/* Yuqori qator: mahsulot nomi + qator summasi */}
      <View className="flex-row items-center justify-between gap-2">
        <Text className="flex-1 text-base font-medium text-ink" numberOfLines={1}>
          {item.product.name}
        </Text>
        <Text className="text-base font-medium" style={{ color: accent, ...tabularNums }}>
          {formatCurrency(lineTotal)}
        </Text>
      </View>

      {/* Pastki qator: birlik narxi + miqdor boshqaruvi + o'chirish */}
      <View className="mt-1 flex-row items-center justify-between gap-2">
        <Text className="flex-1 text-xs text-muted" numberOfLines={1}>
          {formatCurrency(item.product.selling_price)} /{" "}
          {isWeight ? t("common.kg") : t("common.pcs")}
        </Text>

        <View className="flex-row items-center" style={{ gap: 6 }}>
          {/*
            Tugmalar 44px dan 34px ga kichraytirildi, lekin hitSlop={8} bilan
            haqiqiy bosish maydoni 50px — a11y minimumidan (44px) yuqori.
          */}
          {isWeight ? (
            <Pressable
              onPress={() => onEditWeight(item)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`${t("sell.weight")}: ${item.product.name}`}
              className="flex-row items-center gap-1.5 rounded-xl bg-bg px-2.5"
              style={{ height: 34 }}
            >
              <Text className="text-sm font-medium text-ink" style={tabularNums}>
                {formatWeight(item.quantity)}
              </Text>
              <Ionicons name="create-outline" size={14} color={colors.muted} />
            </Pressable>
          ) : (
            <>
              <Pressable
                onPress={() => decrement(item.product.id)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`${t("a11y.decrease", "Kamaytirish")}: ${item.product.name}`}
                className="items-center justify-center rounded-xl bg-bg"
                style={{ height: 34, width: 34 }}
              >
                <Ionicons name="remove" size={18} color={colors.ink} />
              </Pressable>
              <Text
                className="text-base font-medium text-ink"
                style={{ minWidth: 24, textAlign: "center" }}
              >
                {item.quantity}
              </Text>
              <Pressable
                onPress={() => increment(item.product.id)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`${t("a11y.increase", "Ko'paytirish")}: ${item.product.name}`}
                className="items-center justify-center rounded-xl bg-primary-tint"
                style={{ height: 34, width: 34 }}
              >
                <Ionicons name="add" size={18} color={colors.primary} />
              </Pressable>
            </>
          )}

          {/*
            Chapdagi hitSlop ataylab kichik (2px): yonidagi "+" / vazn tugmasi
            o'ng tomonga 8px cho'ziladi, umumiy oraliq 12px. Aks holda ikki
            bosish maydoni ustma-ust tushib, "+" ning o'ng chetini bosganda
            mahsulot tasodifan o'chib ketardi.
          */}
          <Pressable
            onPress={() => remove(item.product.id)}
            hitSlop={{ top: 10, bottom: 10, left: 2, right: 12 }}
            className="ml-1.5"
            accessibilityRole="button"
            accessibilityLabel={`${t("common.delete")}: ${item.product.name}`}
          >
            <Ionicons name="trash-outline" size={18} color="#DB2777" />
          </Pressable>
        </View>
      </View>
    </View>
  );
});

export default function SotuvScreen() {
  const colors = useColors();

  const router = useRouter();
  const { t } = useTranslation();
  const shopId = useActiveShopId();
  const { canManageProducts } = useActivePermissions();

  const items = useCart((s) => s.items);
  const add = useCart((s) => s.add);
  const clear = useCart((s) => s.clear);
  const pendingWeight = useCart((s) => s.pendingWeight);
  const setPendingWeight = useCart((s) => s.setPendingWeight);

  const [payOpen, setPayOpen] = useState(false);
  const [search, setSearch] = useState("");
  const debounced = useDebounce(search, 300);
  const searching = search.trim().length > 0;

  // Tezkor narx (P9) — shtrix-kodsiz/katalogsiz tovar
  const [quickPriceOpen, setQuickPriceOpen] = useState(false);
  const [quickPriceSaving, setQuickPriceSaving] = useState(false);

  // VAZN tezkor oynasi uchun mahsulot (+ tahrirlashda boshlang'ich kg)
  const [weightTarget, setWeightTarget] = useState<{ product: Product; initialKg?: number } | null>(
    null,
  );

  // Skanerда topilgan VAZN mahsulot → tezkor oynani ochamiz
  useEffect(() => {
    if (pendingWeight) {
      setWeightTarget({ product: pendingWeight });
      setPendingWeight(null);
    }
  }, [pendingWeight, setPendingWeight]);

  /*
    Tashqi (HID) skaner — kamera bilan BIR XIL quvurdan o'tadi.
    VAZN mahsulotda `useScanHandler` `setPendingWeight` ni yozadi va
    yuqoridagi effekt kg oynasini o'zi ochadi, shuning uchun bu ekranda
    `onWeight` kerak emas (skaner ekranida esa u navigatsiya qiladi).
  */
  // `useScanHandler` va `useScanDetect` bir-biriga qarama-qarshi bog'liq
  // (biri natijani beradi, ikkinchisi matnni qaytaradi) — halqani uzish
  // uchun ref ishlatiladi.
  const scanDetectRef = useRef<ScanDetect | null>(null);

  const { handleScan } = useScanHandler({
    onResult: (outcome) => {
      // Kod MAHSULOTGA aylandi → qidiruvni tozalaymiz (kassir keyingi
      // mahsulotga o'tadi). Topilmasa matn QOLADI — foydalanuvchi nima
      // skanerlanganini ko'rsin va uni nom bo'yicha qidira olsin.
      if (outcome.kind === "unit" || outcome.kind === "weight") setSearch("");
      // Topilmadi → kod maydonga qaytariladi: kassir nima skanerlanganini
      // ko'rsin va uni nom bo'yicha qidira olsin.
      if (outcome.kind === "not-found") {
        scanDetectRef.current?.restore(outcome.code);
        toast.info(t("scanner.notFound", { code: outcome.code }));
      }
    },
  });

  /*
    Qidiruv maydoni SKANER-XABARDOR. Qurilmada aniqlandi: Android apparat
    klaviaturasidan (HID skaner) kelgan kiritishni ekrandagi BIRINCHI matn
    maydoniga yo'naltiradi. Ko'rinmas maydonni fokusda ushlashga urinish
    o'rniga kiritish qayerga tushsa o'sha yerda taniymiz.
  */
  const scanDetect = useScanDetect({
    onScan: handleScan,
    // Maydonga nima YOZILISHINI hook hal qiladi: skanerdan kelayotgan
    // kod ekranda ko'rinmaydi, odam yozgani esa odatdagidek ko'rinadi.
    onText: setSearch,
  });
  // Yozish EFFEKTDA: render paytida ref o'zgartirish React qoidasini buzadi.
  useEffect(() => {
    scanDetectRef.current = scanDetect;
  });

  const { data: results } = useQuery({
    queryKey: ["sell-search", debounced.trim(), shopId],
    enabled: !!shopId && debounced.trim().length > 0,
    queryFn: () => searchSellProducts(debounced, shopId as string),
  });

  const { data: frequentProducts } = useFrequentProducts();

  const total = cartTotal(items);

  const onPick = useCallback(
    (p: Product) => {
      if (p.sale_type === "weight") {
        setWeightTarget({ product: p });
      } else {
        add(p);
      }
      setSearch("");
    },
    [add],
  );

  const onEditWeight = useCallback((it: CartItem) => {
    setWeightTarget({ product: it.product, initialKg: it.quantity });
  }, []);

  async function onQuickPriceConfirm(amount: number) {
    if (!shopId) return;
    // Savatda allaqachon boshqa narxli "Boshqa tovar" bo'lsa — bir xil mahsulot
    // id'ida ikki xil narx to'qnashib, savat summasi noto'g'ri hisoblanib qoladi.
    if (items.some((i) => isMiscProduct(i.product))) {
      toast.info(t("sell.miscExistsTitle"), t("sell.miscExistsDesc"));
      return;
    }
    setQuickPriceSaving(true);
    try {
      const product = await priceMiscProduct(shopId, amount);
      add(product);
      setQuickPriceOpen(false);
    } catch (e) {
      toast.error(t("common.error"), e instanceof Error ? e.message : t("sell.quickPriceError"));
    } finally {
      setQuickPriceSaving(false);
    }
  }

  const renderCartItem = useCallback(
    ({ item }: { item: CartItem }) => <CartRow item={item} onEditWeight={onEditWeight} />,
    [onEditWeight],
  );

  function onCheckout() {
    if (!shopId) {
      Alert.alert("Do'kon Xatosi", "Do'kon identifikatori (shopId) topilmadi! Iltimos, do'konni qayta tanlang.");
      return;
    }
    if (items.length === 0) {
      Alert.alert(t("sell.cartErrorTitle"), "Savatda mahsulot mavjud emas!");
      return;
    }
    setPayOpen(true);
  }

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <View className="px-4 pt-2">
        <View className="flex-row items-center justify-between pb-3">
          <Text className="text-2xl font-medium text-heading">{t("sell.title")}</Text>
          {items.length > 0 ? (
            <Pressable onPress={clear} hitSlop={10}>
              <Text className="text-sm text-danger">{t("common.clear")}</Text>
            </Pressable>
          ) : null}
        </View>

        {/*
          Qidiruv (skaner maydon ICHIDA) + Tezkor narx.

          Ilgari bu yerda 56px balandlikdagi butun kenglikdagi "Skanerlash"
          tugmasi turardi. Katta nishon yo'qolmadi — u pastki navigatsiyaning
          markaziy tugmasiga ko'chdi (bosh barmoq zonasi, har ekrandan
          yetib boriladi), bu yerda esa ~68px bo'shadi.

          Belgi `scan-outline` (kadr burchaklari), `barcode-outline` EMAS:
          chiziqlar "shtrix-kod" degan NARSANI bildiradi, kadr burchaklari
          esa "skanerlash" AMALINI.
        */}
        <View className="mb-2 flex-row items-center gap-2">
          <View
            /*
              Ichki chekkalar KENG (chap 24, o'ng 12). Maydon radiusi 16px —
              ya'ni burchak egri chizig'i chekkadan ~16px ichkarigacha
              cho'ziladi. 16px padding bilan ikonka aynan shu egrilikka
              tegib turardi va "devorga tiralib qolgan" bo'lib ko'rinardi.

              ⚠️ Padding ATAYLAB inline `style`da, `className`da EMAS.
              `pl-6`/`pr-3` butun loyihada boshqa hech qayerda ishlatilmagan
              — NativeWind bunday klassni kompilyatsiya qilingan CSS'ga
              qo'shmaydi va uni jimgina E'TIBORSIZ qoldiradi (xato ham
              bermaydi). Metro'da `r` bosilganda hech narsa o'zgarmasligining
              sababi shu edi; kesh tozalash (`--clear`) kerak bo'lardi.
              Inline qiymat esa har doim ishlaydi.
            */
            className="flex-1 flex-row items-center rounded-2xl border border-line bg-surface"
            style={{ height: 58, paddingLeft: 24, paddingRight: 12, gap: 12 }}
          >
            <Ionicons name="search" size={22} color={colors.tabInactive} />
            <TextInput
              testID="sell-search"
              value={search}
              onChangeText={(next) => {
                setSearch(next);
                scanDetect.onChangeText(next);
              }}
              onSubmitEditing={scanDetect.onSubmitEditing}
              // Skaner Enter yuborganda maydon fokusni YO'QOTMASIN —
              // aks holda keyingi skan boshqa joyga tushardi.
              blurOnSubmit={false}
              returnKeyType="search"
              placeholder={t("sell.searchPlaceholder")}
              placeholderTextColor={colors.tabInactive}
              // Shrift `className`da EMAS: NativeWind klassi va inline
              // `style` bir xil xossani bersa qaysi biri yutishi aniq emas
              // — `text-base` olib tashlanib, o'lcham tokendan beriladi.
              className="flex-1 text-ink"
              style={{ height: 58, fontSize: text.lg }}
              autoCapitalize="none"
            />
            {search ? (
              <Pressable
                onPress={() => setSearch("")}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t("a11y.clearSearch", "Qidiruvni tozalash")}
              >
                <Ionicons name="close-circle" size={18} color={colors.tabInactive} />
              </Pressable>
            ) : null}
            {/* Skaner — maydon ichida, TO'LDIRILGAN brend ko'kida.
                Ilgari och tint fon + ko'k ikonka edi: nozik chiziqli belgi
                oqish fonda so'nib ketardi. To'ldirilgan kvadrat esa
                maydondagi yagona rangli element — ko'z darhol unga tushadi. */}
            <Pressable
              onPress={() => router.push("/scanner")}
              accessibilityRole="button"
              accessibilityLabel={t("barcode.scanBtn")}
              className="items-center justify-center rounded-xl bg-primary"
              style={{ width: 44, height: 44 }}
            >
              {/*
                `scan-outline` — faqat to'rtta burchak, o'rtasida chiziq YO'Q.
                Skaner nuri shu yerda qo'lda chiziladi: burchaklar "kadr",
                chiziq esa "skanerlanyapti" degan ma'noni beradi (brend
                belgisi `LogoMark` da ham xuddi shu nur bor).

                Absolyut bola Yoga'da ota-onaning `alignItems`/
                `justifyContent` iga bo'ysunadi — `top`/`left` hisoblash
                shart emas, o'zi markazda turadi.
              */}
              <View style={{ width: 25, height: 25, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="scan-outline" size={25} color="#fff" />
                <View
                  style={{
                    position: "absolute",
                    width: 13,
                    height: 2,
                    borderRadius: radius.full,
                    backgroundColor: "#fff",
                  }}
                />
              </View>
            </Pressable>
          </View>

          {canManageProducts ? (
            <Pressable
              onPress={() => setQuickPriceOpen(true)}
              accessibilityRole="button"
              accessibilityLabel={t("sell.quickPrice")}
              className="items-center justify-center rounded-2xl bg-primary-tint"
              style={{ height: 58, width: 58 }}
            >
              <Ionicons name="cash-outline" size={24} color={colors.primary} />
            </Pressable>
          ) : null}
        </View>

        {/*
          Tez-tez sotiladigan — shtrix-kodsiz/qidiruvsiz bir bosishda savatga.
          Savatga birinchi mahsulot tushishi bilan yashiriladi: bu paneldan
          keyin diqqat savatga ko'chadi va u ~110px joyni bo'shatadi. Qo'shimcha
          mahsulot skaner yoki qidiruv orqali qo'shiladi.
        */}
        {!searching && items.length === 0 && frequentProducts && frequentProducts.length > 0 ? (
          <View className="mb-1">
            <Text className="mb-2 text-xs font-medium text-muted" style={{ letterSpacing: 0.5 }}>
              {t("sell.frequent").toUpperCase()}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
            >
              {frequentProducts.map((p) => (
                <FrequentTile key={p.id} product={p} onPress={() => onPick(p)} />
              ))}
            </ScrollView>
          </View>
        ) : null}
      </View>

      {searching ? (
        <FlatList
          data={results ?? []}
          keyExtractor={(p) => p.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
          ListEmptyComponent={
            <Text className="px-2 py-8 text-center text-muted">{t("sell.notFoundOrOut")}</Text>
          }
          renderItem={({ item, index }) => (
            <Pressable
              testID={index === 0 ? "sell-result-first" : undefined}
              onPress={() => onPick(item)}
              className="mb-2 flex-row items-center gap-3 rounded-2xl border border-line bg-surface p-3"
            >
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-primary-tint">
                <Ionicons name="cube-outline" size={20} color={colors.primary} />
              </View>
              <View className="flex-1">
                <Text className="text-base text-ink" numberOfLines={1}>
                  {item.name}
                </Text>
                <Text className="text-xs text-muted">
                  {item.sale_type === "weight" ? t("common.kg") : t("common.pcs")}
                </Text>
              </View>
              <Text className="text-base font-medium text-heading">
                {formatCurrency(item.selling_price)}
              </Text>
              <Ionicons name="add-circle" size={28} color={colors.primary} />
            </Pressable>
          )}
        />
      ) : items.length === 0 ? (
        <View className="flex-1 items-center justify-center px-10">
          <View className="mb-4 h-20 w-20 items-center justify-center rounded-3xl bg-primary-tint">
            <Ionicons name="cart-outline" size={36} color={colors.primary} />
          </View>
          <Text className="text-center text-base text-muted">
            {t("cart.empty")}. {t("cart.emptyHint")}.
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.product.id}
          renderItem={renderCartItem}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 12 }}
          ListHeaderComponent={
            <Text className="pb-2 text-base font-medium text-ink">
              {t("cart.title")} <Text className="text-muted">({items.length})</Text>
            </Text>
          }
          removeClippedSubviews
        />
      )}

      {/* Pastki to'lov paneli */}
      {items.length > 0 && !searching ? (
        <View className="border-t border-line bg-surface px-4 pt-3" style={{ paddingBottom: 14 }}>
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-xs text-muted" style={{ letterSpacing: 0.5 }}>
              {t("cart.total").toUpperCase()}
            </Text>
            <Text className="text-xl font-medium text-ink" style={tabularNums}>
              {formatCurrency(total)}
            </Text>
          </View>
          {/* Ilovadagi eng ko'p bosiladigan tugma — bosilish javobi shu yerda
              eng muhim. `TouchableOpacity` o'rniga `PressableScale`. */}
          <PressableScale
            onPress={onCheckout}
            accessibilityRole="button"
            accessibilityLabel={t("sell.payment")}
            style={{
              height: 54,
              backgroundColor: colors.primary,
              borderRadius: radius.lg,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              width: "100%",
            }}
          >
            <Text style={{ fontSize: text.base, fontWeight: "600", color: "#fff" }}>{t("sell.payment")}</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </PressableScale>
        </View>
      ) : null}

      {/* Tezkor narx oynasi (P9) */}
      <QuickPriceSheet
        visible={quickPriceOpen}
        loading={quickPriceSaving}
        onClose={() => setQuickPriceOpen(false)}
        onConfirm={onQuickPriceConfirm}
      />

      {/* VAZN tezkor oynasi */}
      <WeightSheet
        product={weightTarget?.product ?? null}
        initialKg={weightTarget?.initialKg}
        onClose={() => setWeightTarget(null)}
        onConfirm={(kg) => {
          if (weightTarget) add(weightTarget.product, kg);
          setWeightTarget(null);
        }}
      />

      {/* To'lov oynasi */}
      <PaymentSheet
        visible={payOpen}
        total={total}
        shopId={shopId}
        items={items}
        onClose={() => setPayOpen(false)}
        onPaid={clear}
      />
    </SafeAreaView>
  );
}
