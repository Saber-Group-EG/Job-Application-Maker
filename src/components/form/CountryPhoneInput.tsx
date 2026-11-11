import { useMemo, useState } from "react";
import {
  getCountries,
  getCountryCallingCode,
  getExampleNumber,
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js";
import examples from "libphonenumber-js/mobile/examples";
import { ChevronDown } from "lucide-react";
import { useLocale } from "../../context/LocaleContext";

const DEFAULT_COUNTRY: CountryCode = "EG";
// Shown first: Egypt and the Gulf/Levant markets (same as the public apply form).
const PINNED: CountryCode[] = ["EG", "SA", "AE", "KW", "QA", "BH", "OM", "JO"];

const digitsOnly = (raw: string) => raw.replace(/\D/g, "").slice(0, 15);

/** "+201152732830" from a country and the locally typed number (leading 0 dropped). */
export function toInternational(country: CountryCode, local: string): string {
  const digits = digitsOnly(local);
  if (!digits) return "";
  const parsed = parsePhoneNumberFromString(digits, country);
  return parsed?.number || `+${getCountryCallingCode(country)}${digits.replace(/^0+/, "")}`;
}

/** Splits a stored number ("+20115…", "0115…") into country + local digits. */
function splitPhone(raw?: string | null): { country: CountryCode; local: string } {
  const value = String(raw || "").trim();
  if (!value) return { country: DEFAULT_COUNTRY, local: "" };
  const intl = value.startsWith("00") ? `+${value.slice(2)}` : value;
  const parsed = intl.startsWith("+")
    ? parsePhoneNumberFromString(intl)
    : parsePhoneNumberFromString(digitsOnly(value), DEFAULT_COUNTRY);
  if (parsed?.country) return { country: parsed.country, local: String(parsed.nationalNumber) };
  return { country: DEFAULT_COUNTRY, local: digitsOnly(value) };
}

type Props = {
  id?: string;
  /** Starting number, any format ("+20115…", "0115…"). Read once, on mount. */
  defaultValue?: string | null;
  /** International number ("+201152732830"), or "" when empty. */
  onChange: (international: string) => void;
  disabled?: boolean;
  /** Classes for the outer box (border, height, radius) so it matches the surrounding form. */
  className?: string;
};

/**
 * Phone number with a country-code picker. The picker is a native <select>
 * laid over a "EG +20" chip, so it's keyboard- and screen-reader-friendly.
 */
export default function CountryPhoneInput({ id, defaultValue, onChange, disabled, className = "" }: Props) {
  const { t, locale } = useLocale();
  const [initial] = useState(() => splitPhone(defaultValue));
  const [country, setCountry] = useState<CountryCode>(initial.country);
  const [local, setLocal] = useState(initial.local);

  const countries = useMemo(() => {
    let names: Intl.DisplayNames | null = null;
    try {
      names = new Intl.DisplayNames([locale === "ar" ? "ar" : "en"], { type: "region" });
    } catch {
      names = null;
    }
    const all = getCountries().map((code) => ({
      code,
      name: names?.of(code) || code,
      dial: `+${getCountryCallingCode(code)}`,
    }));
    const pinned = PINNED.map((c) => all.find((o) => o.code === c)!).filter(Boolean);
    const rest = all
      .filter((o) => !PINNED.includes(o.code))
      .sort((a, b) => a.name.localeCompare(b.name, locale === "ar" ? "ar" : "en"));
    return [...pinned, ...rest];
  }, [locale]);

  const placeholder = useMemo(() => {
    const example = getExampleNumber(country, examples);
    return example ? example.formatNational() : "";
  }, [country]);

  const emit = (c: CountryCode, l: string) => onChange(toInternational(c, l));

  return (
    <div
      dir="ltr"
      className={`flex items-stretch overflow-hidden rounded-lg border border-gray-300 bg-transparent shadow-theme-xs focus-within:border-brand-300 focus-within:ring-3 focus-within:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 ${
        disabled ? "opacity-60" : ""
      } ${className}`}
    >
      <div className="relative flex shrink-0 items-center gap-1 border-e border-gray-200 px-3 text-sm dark:border-gray-700">
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{country}</span>
        <span className="font-medium text-gray-800 dark:text-white/90">+{getCountryCallingCode(country)}</span>
        <ChevronDown className="size-4 text-gray-400" aria-hidden="true" />
        <select
          aria-label={t("phoneCountry", "common")}
          value={country}
          disabled={disabled}
          onChange={(e) => {
            const c = e.target.value as CountryCode;
            setCountry(c);
            emit(c, local);
          }}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
        >
          {countries.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name} ({c.dial})
            </option>
          ))}
        </select>
      </div>
      <input
        id={id}
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        maxLength={15}
        value={local}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => {
          const l = digitsOnly(e.target.value);
          setLocal(l);
          emit(country, l);
        }}
        onPaste={(e) => {
          // A pasted "+9665…" picks its own country.
          const text = e.clipboardData.getData("text");
          if (/^\s*(\+|00)/.test(text)) {
            e.preventDefault();
            const split = splitPhone(text);
            setCountry(split.country);
            setLocal(split.local);
            emit(split.country, split.local);
          }
        }}
        className="h-11 min-w-0 flex-1 bg-transparent px-3 text-sm text-gray-800 outline-none placeholder:text-gray-400 dark:text-white/90 dark:placeholder:text-white/30"
      />
    </div>
  );
}
