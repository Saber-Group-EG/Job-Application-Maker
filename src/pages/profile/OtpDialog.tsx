// Dialog that sends a one-time code and asks for it back. Used on the
// profile page to verify an email / WhatsApp number and to set up or move
// two-step verification. With `channels`, the user first picks where the
// code goes; otherwise it is sent as soon as the dialog opens.
import { ReactNode, useEffect, useRef, useState } from "react";
import { Modal } from "../../components/ui/modal";
import { Button, Field, Segmented, inputClass } from "../../components/ui/kit";
import { useLocale } from "../../context/LocaleContext";
import type { OtpChannel, OtpSent } from "../../types/auth";
import { cleanCode, isOtpDead, otpErrorMessage, otpResendIn, useCountdown } from "../../components/auth/otp";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  title: ReactNode;
  /** Shown before the code is sent (when choosing a channel). */
  intro?: ReactNode;
  /** Channels to choose from; omit to send on `initialChannel` right away. */
  channels?: Array<{ value: OtpChannel; label: string; disabled?: boolean; hint?: string }>;
  initialChannel: OtpChannel;
  send: (channel: OtpChannel) => Promise<OtpSent | undefined>;
  confirm: (channel: OtpChannel, code: string) => Promise<void>;
  confirmLabel?: string;
  onDone: (channel: OtpChannel) => void;
};

export default function OtpDialog({
  isOpen,
  onClose,
  title,
  intro,
  channels,
  initialChannel,
  send,
  confirm,
  confirmLabel,
  onDone,
}: Props) {
  const { t } = useLocale();
  const [channel, setChannel] = useState<OtpChannel>(initialChannel);
  const [sent, setSent] = useState<OtpSent | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const countdown = useCountdown();
  const autoSent = useRef(false);

  const doSend = async (target: OtpChannel) => {
    setError(null);
    setSending(true);
    try {
      const info = await send(target);
      setSent(info ?? { channel: target, expiresIn: 600, resendIn: 60 });
      countdown.start(info?.resendIn ?? 60);
    } catch (err) {
      setError(otpErrorMessage(err, t));
      const resendIn = otpResendIn(err);
      if (typeof resendIn === "number") countdown.start(resendIn);
    } finally {
      setSending(false);
    }
  };

  // Fresh state every time the dialog opens.
  useEffect(() => {
    if (!isOpen) {
      autoSent.current = false;
      return;
    }
    setChannel(initialChannel);
    setSent(null);
    setCode("");
    setError(null);
    if (!channels && !autoSent.current) {
      autoSent.current = true;
      doSend(initialChannel);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleConfirm = async () => {
    if (code.length !== 6) {
      setError(t("fillAllFields", "common"));
      return;
    }
    setError(null);
    setConfirming(true);
    try {
      await confirm(channel, code);
      onDone(channel);
    } catch (err) {
      setError(otpErrorMessage(err, t));
      if (isOtpDead(err)) {
        setSent(null);
        setCode("");
      }
    } finally {
      setConfirming(false);
    }
  };

  const choosing = Boolean(channels) && !sent;
  const selected = channels?.find((c) => c.value === channel);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="mx-4 max-w-md overflow-hidden !rounded-2xl !bg-white dark:!bg-slate-900"
    >
      <div className="-m-4">
        <div className="border-b border-slate-200 px-6 py-5 pe-16 dark:border-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h2>
          {sent ? (
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              {sent.destination
                ? t("otpSentTo", "common", { destination: sent.destination })
                : t("checkYourEmailDesc", "common")}
            </p>
          ) : (
            intro && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{intro}</p>
          )}
        </div>

        <div className="space-y-4 px-6 py-5">
          {error && (
            <p
              role="alert"
              className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300"
            >
              {error}
            </p>
          )}

          {choosing && channels && (
            <Field label={t("twoFactorChannelLabel", "common")} hint={selected?.hint}>
              <div>
                <Segmented
                  ariaLabel={t("twoFactorChannelLabel", "common")}
                  value={channel}
                  onChange={(v) => {
                    if (!channels.find((c) => c.value === v)?.disabled) setChannel(v);
                  }}
                  options={channels.map((c) => ({ value: c.value, label: c.label }))}
                />
              </div>
            </Field>
          )}

          {sent && (
            <>
              <Field label={t("enter6DigitCode", "common")} htmlFor="otpDialogCode">
                <input
                  type="text"
                  id="otpDialogCode"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  dir="ltr"
                  maxLength={6}
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(cleanCode(e.target.value))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleConfirm();
                  }}
                  className={`${inputClass} text-center font-mono text-lg tracking-[0.5em]`}
                />
              </Field>
              <button
                type="button"
                onClick={() => doSend(channel)}
                disabled={countdown.remaining > 0 || sending}
                className="text-sm text-brand-500 hover:text-brand-600 disabled:cursor-not-allowed disabled:text-slate-400 dark:text-brand-400"
              >
                {countdown.remaining > 0
                  ? t("otpResendIn", "common", { seconds: countdown.remaining })
                  : t("resendCode", "common")}
              </button>
            </>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 px-6 py-4 dark:border-slate-800 sm:flex-row sm:justify-end">
          <Button onClick={onClose}>{t("cancel", "common")}</Button>
          {choosing ? (
            <Button
              variant="primary"
              onClick={() => doSend(channel)}
              loading={sending}
              disabled={Boolean(selected?.disabled)}
            >
              {t("otpSendCode", "common")}
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={handleConfirm}
              loading={confirming}
              disabled={!sent || sending}
            >
              {confirmLabel || t("otpVerify", "common")}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
