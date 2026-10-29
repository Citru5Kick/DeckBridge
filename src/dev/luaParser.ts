// Minimal parser for WoW SavedVariables files (a subset of Lua table syntax).
export type LuaValue = string | number | boolean | null | { [k: string]: LuaValue };

export function parseLuaSaved(src: string): { [k: string]: LuaValue } {
  if (Buffer.byteLength(src, "utf8") > 8 * 1024 * 1024) throw new Error("DEV SavedVariables is too large");
  let i = 0;
  let depth = 0, nodes = 0;
  const reIdent = /[A-Za-z_]\w*/y;
  const reNum = /-?(?:0[xX][0-9a-fA-F]+|(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)/y;

  const ws = () => {
    for (;;) {
      while (i < src.length && /\s/.test(src[i])) i++;
      if (src.startsWith("--", i)) {
        while (i < src.length && src[i] !== "\n") i++;
      } else return;
    }
  };

  const match = (re: RegExp): string | null => {
    re.lastIndex = i;
    const m = re.exec(src);
    return m ? m[0] : null;
  };

  const str = (): string => {
    const q = src[i++];
    let out = "";
    while (i < src.length && src[i] !== q) {
      if (src[i] === "\\") {
        i++;
        const c = src[i++];
        out += c === "n" ? "\n" : c === "t" ? "\t" : c === "r" ? "\r" : c;
      } else out += src[i++];
      if (out.length > 4096) throw new Error("DEV SavedVariables string is too long");
    }
    if (src[i] !== q) throw new Error("Unterminated string");
    i++;
    return out;
  };

  const value = (): LuaValue => {
    if (++nodes > 100000) throw new Error("Too many DEV SavedVariables values");
    ws();
    const c = src[i];
    if (c === '"' || c === "'") return str();
    if (c === "{") return table();
    const n = match(reNum);
    if (n !== null) {
      i += n.length;
      return Number(n);
    }
    const w = match(reIdent);
    if (w !== null) {
      i += w.length;
      if (w === "true") return true;
      if (w === "false") return false;
      if (w === "nil") return null;
    }
    throw new Error(`Unexpected token at ${i}`);
  };

  const table = (): LuaValue => {
    if (++depth > 32) throw new Error("DEV SavedVariables nesting limit exceeded");
    i++; // {
    const obj: { [k: string]: LuaValue } = Object.create(null);
    let n = 1;
    for (;;) {
      ws();
      if (i >= src.length) throw new Error("Unterminated table");
      if (src[i] === "}") {
        i++;
        depth--;
        return obj;
      }
      let key: string | undefined;
      if (src[i] === "[") {
        i++;
        key = String(value());
        ws();
        if (src[i] !== "]") throw new Error("Expected ]");
        i++; // ]
        ws();
        if (src[i] !== "=") throw new Error("Expected =");
        i++; // =
      } else {
        const id = match(reIdent);
        if (id !== null) {
          const save = i;
          i += id.length;
          ws();
          if (src[i] === "=") {
            i++;
            key = id;
          } else i = save;
        }
      }
      obj[key ?? String(n++)] = value();
      ws();
      if (src[i] === "," || src[i] === ";") i++;
      else if (src[i] !== "}") throw new Error("Expected table separator");
    }
  };

  const root: { [k: string]: LuaValue } = Object.create(null);
  for (;;) {
    ws();
    if (i >= src.length) break;
    const id = match(reIdent);
    if (id === null) throw new Error(`Unexpected token at ${i}`);
    i += id.length;
    ws();
    if (src[i] !== "=") throw new Error("Expected assignment");
    i++; // =
    root[id] = value();
  }
  return root;
}
