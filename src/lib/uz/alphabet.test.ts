import { describe, expect, it } from "vitest";
import { toNewAlphabet, toOldAlphabet, parseProtectedWords } from "@/lib/uz/alphabet";

const P = ["ChatGPT", "GitHub"];

describe("alphabet", () => {
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
