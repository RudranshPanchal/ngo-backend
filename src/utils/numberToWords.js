import { ToWords } from "to-words";

const toWords = new ToWords({
  localeCode: "en-IN",
  converterOptions: {
    currency: true,
    ignoreDecimal: true
  }
});

export function numberToWords(amount) {
  return toWords.convert(amount);
}
