import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { MessageCircle } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useLocale } from "../../context/LocaleContext";
import { authService } from "../../services/authService";
import { authKeys } from "../../hooks/queries/useAuth";
import { Badge, Button, Card, Field, Segmented, inputClass } from "../ui/kit";

// Profile card: prove the phone number is yours with a WhatsApp code, then use
// it to sign in, reset the password and (optionally) receive 2FA codes.
export default function WhatsAppPhoneCard({ twoFAEnabled }: { twoFAEnabled: boolean }) {
  const { user } = useAuth();
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const verified = Boolean(user?.phoneVerified && user?.phone);

  const [editing, setEditing] = useState(false);
  const [phone, setPhone] = useState(user?.phone || "");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [method, setMethod] = useState<"email" | "whatsapp">(user?.twoFactorMethod || "email");

  const refreshUser = () => queryClient.invalidateQueries({ queryKey: authKeys.currentUser() });

  async function sendCode() {
    setError(null);
    setBusy(true);
    try {
      const res = await authService.sendPhoneCode(phone);
      setSentTo(res.to);
      setCode("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    if (code.length < 6) return setError(t("enter6DigitCode", "common"));
    setError(null);
    setBusy(true);
    try {
      await authService.verifyPhone(code);
      await refreshUser();
      setSentTo(null);
      setEditing(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function changeMethod(next: "email" | "whatsapp") {
    const prev = method;
    setMethod(next);
    setError(null);
    try {
      await authService.setTwoFactorMethod(next);
      await refreshUser();
    } catch (err) {
      setMethod(prev);
      setError((err as Error).message);
    }
  }

  const showForm = !verified || editing;

  return (
    <Card className="p-4">
      <div className="flex gap-3">
        <MessageCircle className="mt-0.5 size-4 shrink-0 text-slate-400" />
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <h2 className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
              {t("whatsAppNumber", "common")}
              <Badge tone={verified ? "green" : "slate"}>
                {verified ? t("verified", "common") : t("notVerified", "common")}
              </Badge>
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("whatsAppProfileDesc", "common")}</p>
          </div>

          {verified && !editing && (
            <div className="flex flex-wrap items-center gap-3">
              <span dir="ltr" className="text-sm font-medium text-slate-800 dark:text-slate-200">
                {user?.phone}
              </span>
              <Button size="sm" onClick={() => setEditing(true)}>
                {t("change", "common")}
              </Button>
            </div>
          )}

          {showForm && (
            <div className="space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <Field label={t("whatsAppNumber", "common")} htmlFor="waPhone">
                    <input
                      id="waPhone"
                      type="tel"
                      dir="ltr"
                      autoComplete="tel"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        setSentTo(null);
                      }}
                      placeholder="+20 10 1234 5678"
                      className={inputClass}
                    />
                  </Field>
                </div>
                <Button onClick={sendCode} loading={busy && !sentTo} disabled={!phone.trim()}>
                  {sentTo ? t("resendCode", "common") : t("sendCodeOnWhatsApp", "common")}
                </Button>
                {editing && (
                  <Button variant="ghost" onClick={() => { setEditing(false); setSentTo(null); setError(null); }}>
                    {t("cancel", "common")}
                  </Button>
                )}
              </div>
              {sentTo && (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <div className="flex-1">
                    <Field
                      label={t("enter6DigitCode", "common")}
                      htmlFor="waVerifyCode"
                      hint={t("whatsAppCodeSentTo", "common").replace("{to}", sentTo)}
                    >
                      <input
                        id="waVerifyCode"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        value={code}
                        onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="000000"
                        className={`${inputClass} tracking-[0.3em]`}
                      />
                    </Field>
                  </div>
                  <Button variant="primary" onClick={verify} loading={busy}>
                    {t("verify", "common")}
                  </Button>
                </div>
              )}
            </div>
          )}

          {verified && twoFAEnabled && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 dark:border-slate-800">
              <span className="text-sm text-slate-600 dark:text-slate-300">{t("send2FACodesBy", "common")}</span>
              <Segmented
                ariaLabel={t("send2FACodesBy", "common")}
                value={method}
                onChange={changeMethod}
                options={[
                  { value: "email", label: t("email", "common") },
                  { value: "whatsapp", label: t("whatsApp", "common") },
                ]}
              />
            </div>
          )}

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        </div>
      </div>
    </Card>
  );
}
