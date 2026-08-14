/**
 * ai-chat Edge Function'ini terminaldan sinash (ilovasiz).
 *
 *   node scripts/ai-chat-test.mjs "Bugun qancha sotdik?"
 *
 * Email/parolni SO'RAB oladi — buyruq satriga yozilmaydi, terminal tarixiga
 * tushmaydi. `.env` dan Supabase URL + anon key o'qiladi.
 *
 * Faqat ishlab chiqish uchun: chat javobini, ishlatilgan tool'larni va token
 * sarfini ko'rsatadi.
 */

import { readFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { createClient } from "@supabase/supabase-js";

// ------------------------------------------------------------------ .env ----

const env = Object.fromEntries(
  readFileSync(new URL("../.env", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const url = env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error("✗ .env da EXPO_PUBLIC_SUPABASE_URL / ANON_KEY topilmadi");
  process.exit(1);
}

// --------------------------------------------------------------- kiritish ---

const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });

// Parol yozilayotganda ekranga chiqmasligi uchun readline chiqishini bloklaymiz.
let muted = false;
rl._writeToOutput = (str) => {
  if (!muted) rl.output.write(str);
};

const ask = (q, hidden = false) =>
  new Promise((resolve) => {
    rl.question(q, (answer) => {
      if (hidden) {
        muted = false;
        rl.output.write("\n");
      }
      resolve(answer);
    });
    if (hidden) muted = true;
  });

const question = process.argv[2] ?? "Bugun qancha sotdik?";

const email = (await ask("Email: ")).trim();
// Parol AI_TEST_PASSWORD env orqali ham berilishi mumkin (CI yoki qayta sinash
// uchun). Terminalda yozilsa — ekranda ko'rinmaydi, faqat uzunligi tasdiqlanadi.
const password = process.env.AI_TEST_PASSWORD ?? (await ask("Parol: ", true));
rl.close();

if (!password) {
  console.error("✗ Parol bo'sh — qayta urinib ko'ring");
  process.exit(1);
}
console.log(`  (parol qabul qilindi: ${password.length} belgi)`);

// ----------------------------------------------------------------- ishga ----

const supabase = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
if (authError) {
  console.error("✗ Kirish xatosi:", authError.message);
  process.exit(1);
}

// Egasi bo'lgan do'konni topamiz (AI faqat egasi uchun).
const { data: member, error: memberError } = await supabase
  .from("shop_members")
  .select("shop_id")
  .eq("role", "owner")
  .limit(1)
  .maybeSingle();

if (memberError || !member) {
  console.error("✗ Egalik qilinadigan do'kon topilmadi:", memberError?.message ?? "yo'q");
  process.exit(1);
}

// `--models` — kalitga ochiq modellar ro'yxati (Google nomlarni eskirtirganda).
// `--diag`   — har bosqichni alohida o'lchash (qaysi qadam sekin/yiqilgan).
// `--stream` — SSE oqimi (matn bo'laklab chiqadi, ilovadagidek).
const listOnly = question === "--models";
const diagOnly = question === "--diag";
const streamMode = question === "--stream";

if (streamMode) {
  const { data: s } = await supabase.auth.getSession();
  const streamQuestion = process.argv[3] ?? "Bugun qancha sotdik?";
  console.log(`\n→ Oqim: ${streamQuestion}\n`);

  const started = Date.now();
  let firstChunkAt = 0;

  const res = await fetch(`${url}/functions/v1/ai-chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${s.session.access_token}`,
      apikey: anonKey,
    },
    body: JSON.stringify({
      shop_id: member.shop_id,
      message: streamQuestion,
      stream: true,
    }),
  });

  if (!res.ok) {
    console.error("✗ Xato:", res.status, await res.text());
    process.exit(1);
  }

  const decoder = new TextDecoder();
  let buffer = "";
  for await (const chunk of res.body) {
    buffer += decoder.decode(chunk, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload) continue;
      const e = JSON.parse(payload);
      if (e.type === "delta") {
        if (!firstChunkAt) firstChunkAt = Date.now() - started;
        process.stdout.write(e.text);
      } else if (e.type === "tool") {
        console.log(`\n[tool: ${e.name}]`);
      } else if (e.type === "reset") {
        console.log("\n[reset]");
      } else if (e.type === "done") {
        console.log("\n" + "─".repeat(60));
        console.log("birinchi bo'lak :", `${firstChunkAt} ms`);
        console.log("jami            :", `${Date.now() - started} ms`);
        console.log("tool'lar        :", e.tools_used?.join(", ") || "yo'q");
        console.log("token           :", `${e.usage?.input} / ${e.usage?.output}`);
      } else if (e.type === "error") {
        console.error("\n✗ Oqim xatosi:", e.error, e.gemini_status ?? "", e.detail ?? "");
      }
    }
  }
  process.exit(0);
}

const body = { shop_id: member.shop_id };
if (listOnly) body.list_models = true;
else if (diagOnly) body.diag = true;
else body.message = question;

console.log(
  listOnly ? "\n→ Mavjud modellar\n" : diagOnly ? "\n→ Diagnostika\n" : `\n→ Savol: ${question}\n`,
);
const started = Date.now();

const { data, error } = await supabase.functions.invoke("ai-chat", { body });

if (error) {
  console.error("✗ Xato:", error.message);
  // Edge Function xato tanasi (JSON) shu yerda bo'ladi.
  if (error.context?.json) console.error(await error.context.json());
  else if (error.context?.text) console.error(await error.context.text());
  process.exit(1);
}

if (listOnly) {
  console.log(data.models.join("\n"));
  process.exit(0);
}

if (diagOnly) {
  for (const s of data.steps) {
    console.log(
      `${s.ok ? "✓" : "✗"} ${String(s.ms).padStart(6)} ms  ${s.name.padEnd(34)} ${s.info}`,
    );
  }
  process.exit(0);
}

console.log("─".repeat(60));
console.log(data.text);
console.log("─".repeat(60));
console.log("model    :", data.model);
console.log("tool'lar :", data.tools_used?.length ? data.tools_used.join(", ") : "yo'q");
console.log("token    :", `${data.usage?.input} kirish / ${data.usage?.output} chiqish`);
console.log("kvota    :", `${data.quota?.used} / ${data.quota?.limit}`);
console.log("vaqt     :", `${Date.now() - started} ms`);
console.log("chat_id  :", data.chat_id);
