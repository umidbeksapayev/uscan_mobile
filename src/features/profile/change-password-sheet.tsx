import { useState } from "react";
import { View, Text } from "react-native";
import { useTranslation } from "react-i18next";

import { supabase } from "@/lib/supabase";
import { authErrorMessage } from "@/lib/auth-errors";
import { logError } from "@/lib/logger";
import { withTimeout } from "@/lib/with-timeout";
import { toast } from "@/lib/toast";
import { useColors } from "@/theme/theme-store";
import { text } from "@/theme/tokens";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";

/** Sekin tarmoqda ham yetarli, lekin oyna abadiy kutmasligi uchun chegara. */
const REQUEST_TIMEOUT_MS = 30_000;

/**
 * Parolni o'zgartirish.
 *
 * JORIY parol ATAYLAB so'raladi: Supabase'ning `updateUser({ password })` uni
 * talab qilmaydi — ochiq telefonni qo'lga kiritgan odam parolni almashtirib,
 * egasini o'z hisobidan chiqarib yuborishi mumkin edi. Tekshiruv
 * `signInWithPassword` bilan qilinadi (o'sha foydalanuvchi, o'sha sessiya —
 * hisob almashmaydi).
 */
export function ChangePasswordSheet({
  visible,
  onClose,
  email,
}: {
  visible: boolean;
  onClose: () => void;
  email: string;
}) {
  const colors = useColors();
  const { t } = useTranslation();

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function close() {
    setCurrent("");
    setNext("");
    setConfirm("");
    setErrorMsg(null);
    onClose();
  }

  async function onSave() {
    setErrorMsg(null);
    if (!current) {
      setErrorMsg(t("profile.currentPasswordRequired"));
      return;
    }
    if (next.length < 6) {
      setErrorMsg(t("auth.passwordTooShort"));
      return;
    }
    if (next !== confirm) {
      setErrorMsg(t("auth.passwordsMismatch"));
      return;
    }
    if (next === current) {
      setErrorMsg(t("profile.passwordSameAsOld"));
      return;
    }

    setSaving(true);
    try {
      // 1-qadam: joriy parolni tekshirish.
      const { error: signInError } = await withTimeout(
        supabase.auth.signInWithPassword({ email, password: current }),
        REQUEST_TIMEOUT_MS,
        "signInWithPassword timeout",
      );
      if (signInError) {
        setErrorMsg(t("profile.currentPasswordWrong"));
        return;
      }

      // 2-qadam: yangi parolni saqlash.
      const { error } = await withTimeout(
        supabase.auth.updateUser({ password: next }),
        REQUEST_TIMEOUT_MS,
        "updateUser timeout",
      );
      if (error) {
        logError("profile.changePassword", error.message);
        setErrorMsg(authErrorMessage(error.message));
        return;
      }

      toast.success(t("profile.passwordChanged"), t("profile.passwordChangedHint"));
      close();
    } catch (e) {
      logError("profile.changePassword", e);
      setErrorMsg(t("auth.errNetworkTimeout"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <BottomSheet visible={visible} onClose={close} keyboardAvoiding>
      <View style={{ gap: 14 }}>
        <View style={{ gap: 4 }}>
          <Text style={{ fontSize: text.lg, fontWeight: "700", color: colors.ink }}>
            {t("profile.changePassword")}
          </Text>
          <Text style={{ fontSize: text.xs, color: colors.muted, lineHeight: 17 }}>
            {t("profile.changePasswordHint")}
          </Text>
        </View>

        <Field
          label={t("profile.currentPassword")}
          value={current}
          onChangeText={(v) => {
            setCurrent(v);
            if (errorMsg) setErrorMsg(null);
          }}
          placeholder="••••••••"
          secureTextEntry
          autoCapitalize="none"
          autoComplete="off"
          textContentType="none"
        />
        <Field
          label={t("auth.newPasswordLabel")}
          value={next}
          onChangeText={(v) => {
            setNext(v);
            if (errorMsg) setErrorMsg(null);
          }}
          placeholder="••••••••"
          secureTextEntry
          autoCapitalize="none"
          autoComplete="off"
          textContentType="none"
        />
        <Field
          label={t("auth.confirmPasswordLabel")}
          value={confirm}
          onChangeText={(v) => {
            setConfirm(v);
            if (errorMsg) setErrorMsg(null);
          }}
          placeholder="••••••••"
          secureTextEntry
          autoCapitalize="none"
          autoComplete="off"
          textContentType="none"
        />

        <Button label={t("common.save")} onPress={onSave} loading={saving} />
        {errorMsg ? (
          <Text style={{ fontSize: text.sm, color: colors.danger, textAlign: "center" }}>
            {errorMsg}
          </Text>
        ) : null}
      </View>
    </BottomSheet>
  );
}
