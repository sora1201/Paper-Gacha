import { afterAll,beforeAll,describe,expect,it } from "vitest";

const originalNavigator=globalThis.navigator;

beforeAll(()=>{
  Object.defineProperty(globalThis,"navigator",{value:{language:"en-US"},configurable:true});
});

afterAll(()=>{
  Object.defineProperty(globalThis,"navigator",{value:originalNavigator,configurable:true});
});

describe("share translations",()=>{
  it.each([
    ["en","share.content","Share content"],
    ["en","share.preview","IEEE reference preview"],
    ["en","share.memo","Memo (optional)"],
    ["en","share.memoPlaceholder","Add a note…"],
    ["en","share.submit","Share"],
    ["en","share.cancel","Cancel"],
    ["ja","share.content","共有内容"],
    ["ja","share.preview","IEEE参考文献のプレビュー"],
    ["ja","share.memo","メモ（任意）"],
    ["ja","share.memoPlaceholder","メモを追加…"],
    ["ja","share.submit","共有する"],
    ["ja","share.cancel","キャンセル"],
  ])("resolves %s %s",async(language,key,expected)=>{
    const {default:i18n}=await import("./i18n");
    await i18n.changeLanguage(language);
    expect(i18n.t(key)).toBe(expected);
  });
});
