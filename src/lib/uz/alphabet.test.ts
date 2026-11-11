import { describe, expect, it } from "vitest";
import { toNewAlphabet, toOldAlphabet, parseProtectedWords } from "@/lib/uz/alphabet";

const P = ["ChatGPT", "GitHub"];

describe("alphabet protected blocks", () => {
  it("leaves indented code blocks alone", () => {
    expect(toNewAlphabet("Matn.\n\n    const shop = fetch(url);\n\nshahar", [])).toBe(
      "Matn.\n\n    const shop = fetch(url);\n\nşahar",
    );
    expect(toNewAlphabet("Matn.\n\n\tshop();\n", [])).toBe("Matn.\n\n\tshop();\n");
  });
  it("converts indented continuation text inside list items and after paragraphs", () => {
    expect(toNewAlphabet("- shahar\n\n    shahar davomi\n", [])).toBe("- şahar\n\n    şahar davomi\n");
    expect(toNewAlphabet("shahar\n    shahar\n", [])).toBe("şahar\n    şahar\n");
  });
  it("protects link reference definitions but not link text", () => {
    expect(toNewAlphabet("[shu][ref] shahar\n\n[ref]: /shop/changelog\n", [])).toBe(
      "[şu][ref] şahar\n\n[ref]: /shop/changelog\n",
    );
    expect(toNewAlphabet("[ref]: <https://x.uz/shop> \"shahar\"\n", [])).toBe(
      "[ref]: <https://x.uz/shop> \"şahar\"\n",
    );
  });
});

describe("alphabet", () => {
  it("protected words keep protection with Uzbek suffixes", () => {
    const PW = ["ChatGPT", "GitHub", "Chrome", "Shopify"];
    const text = "ChatGPTga, GitHubda, Chromeda, Shopifyning";
    const once = toNewAlphabet(text, PW);
    expect(once).toBe(text);
    expect(toNewAlphabet(once, PW)).toBe(once);
  });
  it("digraphs", () => {
    expect(toNewAlphabet("oʻzbek gʻoya shahar choy", P)).toBe("özbek ğoya şahar çoy");
  });
  it("apostrophe variants after o/g", () => {
    for (const a of ["ʻ", "'", "‘", "’"]) expect(toNewAlphabet(`o${a}g${a}il`, P)).toBe("öğil");
  });
  it("backticks are inline code, not apostrophes", () => {
    expect(toNewAlphabet("o`g`il", P)).toBe("o`g`il");
  });
  it("word-final o'/g' converts", () => {
    expect(toNewAlphabet("tog' bog'.", P)).toBe("toğ boğ.");
    expect(toNewAlphabet("Bog'", P)).toBe("Boğ");
  });
  it("case", () => {
    expect(toNewAlphabet("Shahar SHAHAR Choy Oʻzbek Gʻalaba", P)).toBe("Şahar ŞAHAR Çoy Özbek Ğalaba");
  });
  it("tutuq normalised, not after o/g", () => {
    expect(toNewAlphabet("ma'no san’at", P)).toBe("maʼno sanʼat");
  });
  it("explicit ʼ after o/g stays tutuq", () => {
    expect(toNewAlphabet("taʼqib goʼ", P)).toBe("taʼqib goʼ");
  });
  it("s + tutuq + h is not a digraph", () => {
    expect(toNewAlphabet("Is'hoq", P)).toBe("Isʼhoq");
  });
  it("sh + tutuq + h", () => {
    expect(toNewAlphabet("mash'hur", P)).toBe("maşʼhur");
  });
  it("ng unchanged", () => {
    expect(toNewAlphabet("tong ming", P)).toBe("tong ming");
  });
  it("quote apostrophe at word start untouched", () => {
    expect(toNewAlphabet("'salom' dedi", P)).toBe("'salom' dedi");
  });
  it("protected words", () => {
    expect(toNewAlphabet("ChatGPT bilan GitHub'da", P)).toBe("ChatGPT bilan GitHubʼda");
  });
  it("protected words stay protected before tutuq, idempotently", () => {
    const Q = ["ChatGPT", "Chrome"];
    const once = toNewAlphabet("ChatGPT'da Chrome'da", Q);
    expect(once).toBe("ChatGPTʼda Chromeʼda");
    expect(toNewAlphabet(once, Q)).toBe(once);
  });
  it("protected zones", () => {
    const md = "---\ntitle: x\n---\nshahar `fetch()` [shu](https://ex.com/shop)\n```mermaid\nA-->B[shahar]\n```\n";
    expect(toNewAlphabet(md, P)).toBe("---\ntitle: x\n---\nşahar `fetch()` [şu](https://ex.com/shop)\n```mermaid\nA-->B[shahar]\n```\n");
  });
  it("idempotent", () => {
    const s = toNewAlphabet("oʻzbek shahar", P);
    expect(toNewAlphabet(s, P)).toBe(s);
  });
  it("toOldAlphabet round trip + index map", () => {
    const r = toOldAlphabet("şahar öğil");
    expect(r.text).toBe("shahar oʻgʻil");
    expect(r.toNewIndex[r.text.indexOf("hahar")]).toBe(0);
    expect(r.toNewIndex[r.text.indexOf("il")]).toBe("şahar öğ".length);
  });
  it("parseProtectedWords", () => {
    expect(parseProtectedWords("# c\nChatGPT\n\n GitHub \n")).toEqual(["ChatGPT", "GitHub"]);
  });
});
