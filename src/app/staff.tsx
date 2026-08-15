import { useState } from "react";
import { View, Text, ScrollView, Pressable, TextInput, ActivityIndicator, Alert, Switch } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { toast } from "@/lib/toast";
import { useColors } from "@/theme/theme-store";
import { shadowGlow } from "@/theme/shadows";
import { radius, text } from "@/theme/tokens";
import { ScreenHeader } from "@/components/ui/screen";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IconChip } from "@/components/ui/icon-chip";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { ListItemCard } from "@/components/ui/list-item-card";
import { useActiveMembership, useActivePermissions } from "@/features/auth/use-memberships";
import { PERMISSION_LABELS } from "@/features/auth/permissions";
import { useStaff, useRemoveMember, useSetPermissions } from "@/features/auth/use-staff";
import { useShopInvites, useInviteMember, useCancelInvite } from "@/features/auth/use-invites";
import { inviteErrorMessage } from "@/features/auth/invite-errors";
import type { MemberPermissions, ShopMemberRow, ShopInviteRow } from "@/types/database";

/* ─────────────────────────────────────────────────────────────────────────
   PermissionsSheet — kassir ruxsatlari (settings.tsx dan ko'chirildi,
   "Kassir" bo'limi ostida jamlash uchun — o'zgarishsiz)
───────────────────────────────────────────────────────────────────────── */
function PermissionsSheet({
  member,
  onClose,
  onSave,
  onRemove,
  saving,
}: {
  member: ShopMemberRow | null;
  onClose: () => void;
  onSave: (permissions: MemberPermissions) => void;
  onRemove: () => void;
  saving: boolean;
}) {
  const colors = useColors();
  const { t } = useTranslation();

  const [perms, setPerms] = useState<MemberPermissions>({});
  const [seen, setSeen] = useState<string | null>(null);
  if (member && seen !== member.user_id) {
    setSeen(member.user_id);
    setPerms({ ...member.permissions });
  } else if (!member && seen !== null) {
    setSeen(null);
  }

  const enabledCount = Object.values(perms).filter(Boolean).length;

  return (
    <BottomSheet visible={!!member} onClose={onClose} keyboardAvoiding>
      <View style={{ paddingBottom: 8 }}>
        {/* Avatar + ism */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 18 }}>
          <View
            style={{
              width: 46,
              height: 46,
              borderRadius: radius.lg,
              backgroundColor: colors.primaryTint,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: text.xl, fontWeight: "800", color: colors.primary }}>
              {(member?.email ?? "?").slice(0, 1).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: text.base, fontWeight: "700", color: colors.ink }} numberOfLines={1}>
              {member?.email}
            </Text>
            <Text style={{ fontSize: text.xs, color: colors.muted, marginTop: 2 }}>
              {t("settings.permCountShort", { count: enabledCount })}
            </Text>
          </View>
        </View>

        {/* Ruxsatlar */}
        <Card padded={false} style={{ overflow: "hidden", marginBottom: 14 }}>
          {PERMISSION_LABELS.map((p, i) => (
            <View key={p.key}>
              {i > 0 && <View style={{ height: 1, backgroundColor: colors.line, marginLeft: 16 }} />}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 16,
                  paddingVertical: 13,
                  gap: 12,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: text.sm, fontWeight: "600", color: colors.ink }}>
                    {t(`staff.perm_${p.key}`, p.label)}
                  </Text>
                  <Text style={{ fontSize: text.xs, color: colors.muted, marginTop: 2, lineHeight: 15 }}>
                    {t(`staff.permHint_${p.key}`, p.hint)}
                  </Text>
                </View>
                <Switch
                  value={!!perms[p.key]}
                  onValueChange={(v) => setPerms((prev) => ({ ...prev, [p.key]: v }))}
                  accessibilityLabel={t(`staff.perm_${p.key}`, p.label)}
                  trackColor={{ true: colors.primary, false: colors.line }}
                  thumbColor="#fff"
                />
              </View>
            </View>
          ))}
        </Card>

        {/* Saqlash tugmasi */}
        <Pressable
          disabled={saving}
          onPress={() => onSave(perms)}
          accessibilityRole="button"
          accessibilityLabel={t("common.save")}
          accessibilityState={{ disabled: saving }}
          style={{
            height: 52,
            borderRadius: radius.lg,
            backgroundColor: colors.primary,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 10,
            opacity: saving ? 0.6 : 1,
            ...shadowGlow(colors.primary),
          }}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ fontSize: text.base, fontWeight: "700", color: "#fff" }}>{t("common.save")}</Text>
          )}
        </Pressable>

        {/* Chiqarish tugmasi */}
        <Pressable
          onPress={onRemove}
          accessibilityRole="button"
          accessibilityLabel={t("settings.removeStaffBtn")}
          style={{
            height: 48,
            borderRadius: radius.lg,
            borderWidth: 1.5,
            borderColor: colors.dangerBorder,
            backgroundColor: colors.dangerTint,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 7,
          }}
        >
          <Ionicons name="person-remove-outline" size={17} color={colors.dangerInk} />
          <Text style={{ fontSize: text.sm, fontWeight: "600", color: colors.dangerInk }}>
            {t("settings.removeStaffBtn")}
          </Text>
        </Pressable>
      </View>
    </BottomSheet>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   CashierRow — kassir qatori (ruxsat soni nishoni bilan)
───────────────────────────────────────────────────────────────────────── */
function CashierRow({
  member,
  first,
  onPress,
}: {
  member: ShopMemberRow;
  first: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  const { t } = useTranslation();
  const [pressed, setPressed] = useState(false);

  const permCount = Object.values(member.permissions ?? {}).filter(Boolean).length;
  const total = PERMISSION_LABELS.length;
  const hasPerms = permCount > 0;

  return (
    <>
      {!first && <View style={{ height: 1, backgroundColor: colors.line, marginLeft: 70 }} />}
      <Pressable
        onPress={onPress}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        android_ripple={{ color: colors.line }}
        accessibilityRole="button"
        accessibilityLabel={`${member.email}, ${
          hasPerms ? t("settings.permGranted", { count: permCount }) : t("settings.permNone")
        }`}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
          paddingHorizontal: 16,
          paddingVertical: 13,
          backgroundColor: pressed ? colors.bg : colors.surface,
        }}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: radius.md,
            backgroundColor: colors.primaryTint,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: text.base, fontWeight: "800", color: colors.primary }}>
            {member.email.slice(0, 1).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: text.sm, fontWeight: "600", color: colors.ink }} numberOfLines={1}>
            {member.email}
          </Text>
          <Text style={{ fontSize: text.xs, color: colors.muted, marginTop: 2 }}>
            {hasPerms ? t("settings.permGranted", { count: permCount }) : t("settings.permNone")}
          </Text>
        </View>
        {/* Ruxsat soni nishoni — ruxsat yo'q bo'lsa neytral, bor bo'lsa brend ko'ki */}
        <Badge label={`${permCount}/${total}`} tone={hasPerms ? "brand" : "neutral"} numeric />
        <Ionicons name="chevron-forward" size={15} color={colors.tabInactive} />
      </Pressable>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   SectionLabel — bo'lim sarlavhasi (settings.tsx dagi bilan bir xil naqsh)
───────────────────────────────────────────────────────────────────────── */
function SectionLabel({ label }: { label: string }) {
  const colors = useColors();

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10, marginLeft: 4 }}>
      <View style={{ width: 3, height: 13, borderRadius: radius.full, backgroundColor: colors.primary }} />
      <Text
        accessibilityRole="header"
        style={{
          fontSize: text.xs,
          fontWeight: "700",
          color: colors.heading,
          letterSpacing: 0.9,
          textTransform: "uppercase",
        }}
      >
        {label}
      </Text>
    </View>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   InviteRow — kutilayotgan taklif qatori (hali qabul qilinmagan)
───────────────────────────────────────────────────────────────────────── */
function InviteRow({
  invite,
  first,
  onCancel,
  canceling,
}: {
  invite: ShopInviteRow;
  first: boolean;
  onCancel: () => void;
  canceling: boolean;
}) {
  const colors = useColors();
  const { t } = useTranslation();

  return (
    <>
      {!first && <View style={{ height: 1, backgroundColor: colors.line, marginLeft: 70 }} />}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
          paddingHorizontal: 16,
          paddingVertical: 13,
        }}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: radius.md,
            backgroundColor: colors.neutralTint,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="hourglass-outline" size={18} color={colors.muted} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: text.sm, fontWeight: "600", color: colors.ink }} numberOfLines={1}>
            {invite.email}
          </Text>
          <Text style={{ fontSize: text.xs, color: colors.muted, marginTop: 2 }}>
            {t("staff.inviteWaiting")}
          </Text>
        </View>
        <Pressable
          onPress={onCancel}
          disabled={canceling}
          accessibilityRole="button"
          accessibilityLabel={t("staff.cancelInviteBtn")}
          hitSlop={8}
          style={{ padding: 6, opacity: canceling ? 0.5 : 1 }}
        >
          {canceling ? (
            <ActivityIndicator size="small" color={colors.muted} />
          ) : (
            <Ionicons name="close-circle-outline" size={20} color={colors.dangerInk} />
          )}
        </Pressable>
      </View>
    </>
  );
}

/**
 * Kassirlar boshqaruvi — Ko'proq → Kassirlar.
 *
 * Ilgari ikkiga bo'lingan edi: xodim qo'shish/ruxsat berish Sozlamalar
 * ichida, "Kassir hisoboti" esa Ko'proqda alohida tugma. Ega "kassirlarni
 * boshqarmoqchiman" deganda ikkalasi ham shu yerda — hisobot tepada,
 * xodim ro'yxati pastda.
 *
 * Email kiritish endi DARHOL biriktirmaydi (`add_shop_member`) — TAKLIF
 * yozadi (`shop_invites`, 044-migratsiya). Kassir hali ro'yxatdan o'tmagan
 * bo'lsa ham ishlaydi (avvalgi "avval ro'yxatdan o'tsin" cheklovi yo'q);
 * ro'yxatga kirgach o'ziga kelgan taklifni onboarding "kutish" ekranida
 * (`(onboarding)/waiting.tsx`) ko'rib ANIQ qabul qiladi.
 */
export default function StaffScreen() {
  const router = useRouter();
  const colors = useColors();
  const { t } = useTranslation();
  const active = useActiveMembership();
  const shopId = active?.shop.id;
  const { isOwner } = useActivePermissions();

  const { data: staff, isLoading, isError, error } = useStaff(isOwner ? shopId : undefined);
  const { data: invites } = useShopInvites(isOwner ? shopId : undefined);
  const inviteMut = useInviteMember(shopId);
  const cancelMut = useCancelInvite(shopId);
  const removeMut = useRemoveMember(shopId);
  const permsMut = useSetPermissions(shopId);

  const [email, setEmail] = useState("");
  const [editing, setEditing] = useState<ShopMemberRow | null>(null);
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  function onAdd() {
    const e = email.trim();
    if (!e) return;
    inviteMut.mutate(
      { email: e },
      {
        onSuccess: () => {
          setEmail("");
          toast.success(t("staff.invited"));
        },
        onError: (err) => {
          toast.error(t("staff.addError"), inviteErrorMessage((err as Error)?.message));
        },
      },
    );
  }

  function onCancelInvite(invite: ShopInviteRow) {
    Alert.alert(t("staff.cancelInviteTitle"), t("staff.cancelInviteConfirm", { email: invite.email }), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("staff.cancelInviteBtn"),
        style: "destructive",
        onPress: () => {
          setCancelingId(invite.id);
          cancelMut.mutate(invite.id, {
            onSettled: () => setCancelingId(null),
            onError: (err) =>
              toast.error(t("staff.cancelInviteError"), (err as Error)?.message ?? t("common.unknownError")),
          });
        },
      },
    ]);
  }

  function onSavePerms(permissions: MemberPermissions) {
    if (!editing) return;
    permsMut.mutate(
      { userId: editing.user_id, permissions },
      {
        onSuccess: () => setEditing(null),
        onError: (err) =>
          toast.error(t("common.saveFailed"), (err as Error)?.message ?? t("common.unknownError")),
      },
    );
  }

  function onRemove() {
    if (!editing) return;
    const m = editing;
    Alert.alert(t("settings.removeStaffTitle"), t("staff.removeConfirm", { name: m.email }), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("staff.removeBtn"),
        style: "destructive",
        onPress: () =>
          removeMut.mutate(m.user_id, {
            onSuccess: () => setEditing(null),
            onError: (err) =>
              toast.error(t("staff.removeError"), (err as Error)?.message ?? t("common.unknownError")),
          }),
      },
    ]);
  }

  const cashiers = (staff ?? []).filter((m) => m.role === "cashier");
  const pendingInvites = invites ?? [];
  const canAdd = !!email.trim() && !inviteMut.isPending;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      <ScreenHeader title={t("settings.sectionCashiers")} />

      {!isOwner ? (
        <View className="flex-1 items-center justify-center px-10" style={{ gap: 8 }}>
          <Ionicons name="lock-closed" size={36} color={colors.muted} />
          <Text className="text-center text-sm text-muted">{t("settings.cashierOnlyOwner")}</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Kassir hisoboti — bo'lim ichidagi eng ustuvor havola */}
          <ListItemCard
            leading={<IconChip icon="stats-chart-outline" tone="brand" />}
            title={t("cashierReport.title")}
            subtitle={t("cashierReport.subtitleOwner")}
            onPress={() => router.push("/cashier-report")}
          />

          <View style={{ height: 22 }} />

          {/* Email qo'shish — kompakt inline karta */}
          <Card
            padded={false}
            elevated
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              paddingLeft: 14,
              paddingRight: 6,
              paddingVertical: 6,
              marginBottom: 6,
            }}
          >
            <Ionicons name="mail-outline" size={17} color={colors.muted} />
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder={t("settings.staffEmailPlaceholder")}
              placeholderTextColor={colors.tabInactive}
              accessibilityLabel={t("staff.addTitle")}
              style={{
                flex: 1,
                fontSize: text.sm,
                color: colors.ink,
                height: 42,
                paddingVertical: 0,
              }}
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              onSubmitEditing={onAdd}
              returnKeyType="done"
            />
            <Pressable
              onPress={onAdd}
              disabled={!canAdd}
              accessibilityRole="button"
              accessibilityLabel={t("staff.addBtn")}
              accessibilityState={{ disabled: !canAdd }}
              style={{
                paddingHorizontal: 16,
                height: 38,
                borderRadius: radius.md,
                backgroundColor: colors.primary,
                alignItems: "center",
                justifyContent: "center",
                opacity: canAdd ? 1 : 0.45,
              }}
            >
              {inviteMut.isPending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={{ fontSize: text.sm, fontWeight: "700", color: "#fff" }}>
                  {t("staff.addBtn")}
                </Text>
              )}
            </Pressable>
          </Card>
          <Text
            style={{
              fontSize: text.xs,
              color: colors.muted,
              marginBottom: 16,
              marginLeft: 4,
              lineHeight: 15,
            }}
          >
            {t("settings.staffEmailHint")}
          </Text>

          {/* Kutilayotgan takliflar — hali qabul qilinmagan */}
          {pendingInvites.length > 0 && (
            <>
              <SectionLabel label={t("staff.pendingInvitesTitle")} />
              <Card padded={false} elevated style={{ overflow: "hidden", marginBottom: 22 }}>
                {pendingInvites.map((inv, i) => (
                  <InviteRow
                    key={inv.id}
                    invite={inv}
                    first={i === 0}
                    onCancel={() => onCancelInvite(inv)}
                    canceling={cancelingId === inv.id}
                  />
                ))}
              </Card>
            </>
          )}

          {/* Kassirlar ro'yxati */}
          {isLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 28 }} />
          ) : isError ? (
            <Card tone="danger" style={{ alignItems: "center" }}>
              <Text style={{ fontSize: text.sm, color: colors.dangerInk, textAlign: "center" }}>
                {(error as Error)?.message ?? t("common.loadError")}
              </Text>
            </Card>
          ) : cashiers.length === 0 ? (
            <Card style={{ padding: 32, alignItems: "center", gap: 10 }}>
              <IconChip icon="people-outline" size="lg" />
              <Text style={{ fontSize: text.base, fontWeight: "600", color: colors.ink }}>
                {t("staff.noCashiers")}
              </Text>
              <Text
                style={{
                  fontSize: text.xs,
                  color: colors.muted,
                  textAlign: "center",
                  lineHeight: 17,
                }}
              >
                {t("settings.noCashiersHint")}
              </Text>
            </Card>
          ) : (
            <Card padded={false} elevated style={{ overflow: "hidden" }}>
              {cashiers.map((m, i) => (
                <CashierRow key={m.user_id} member={m} first={i === 0} onPress={() => setEditing(m)} />
              ))}
            </Card>
          )}
        </ScrollView>
      )}

      <PermissionsSheet
        member={editing}
        onClose={() => setEditing(null)}
        onSave={onSavePerms}
        onRemove={onRemove}
        saving={permsMut.isPending}
      />
    </SafeAreaView>
  );
}
