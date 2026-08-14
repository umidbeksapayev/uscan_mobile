// Gemini REST client — yupqa qatlam (SDK'siz).
//
// SDK o'rniga `fetch`: Edge Function bundle'i kichik qoladi va SDK versiyasi
// Deno bilan mos kelmasligi xavfi yo'q. Function calling REST'da to'liq bor.

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models";

export interface GeminiPart {
  text?: string;
  functionCall?: { name: string; args?: Record<string, unknown> };
  functionResponse?: { name: string; response: Record<string, unknown> };
  /**
   * Gemini 3.x fikrlash imzosi. Tool chaqiruvi tarixga QAYTARILGANDA shu imzo
   * ham bo'lishi SHART, aks holda 400: "Function call is missing a
   * thought_signature". Shu sabab model javobining bo'laklari qayta
   * qurilmaydi — xom holida saqlanadi.
   */
  thoughtSignature?: string;
}

export interface GeminiContent {
  role: "user" | "model";
  parts: GeminiPart[];
}

export interface GeminiResult {
  content: GeminiContent | null;
  finishReason?: string;
  usage: { input: number; output: number };
}

export class GeminiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retryable: boolean,
    /** Google qaytargan tavsif — diagnostika uchun (kalit bo'lmaydi). */
    readonly detail = "",
  ) {
    super(message);
  }
}

interface CallOptions {
  apiKey: string;
  model: string;
  system: string;
  contents: GeminiContent[];
  tools: unknown[];
  signal: AbortSignal;
  maxOutputTokens?: number;
  /**
   * Fikrlash sozlamasini majburan belgilash (diagnostika uchun):
   * `undefined` — avtomatik tanlangan variant, `null` — parametrsiz.
   */
  thinkingOverride?: Record<string, unknown> | null;
  /** Urinish chegarasini o'zgartirish (diagnostika uchun). */
  attemptTimeoutMs?: number;
}

/**
 * Kalitga ochiq bo'lgan va `generateContent` ni qo'llab-quvvatlaydigan modellar.
 * Google model nomlarini vaqti-vaqti bilan eskirtiradi — shu ro'yxat orqali
 * kodga tegmasdan `GEMINI_MODEL` secret'ini yangilash mumkin.
 */
export async function listModels(apiKey: string, signal: AbortSignal): Promise<string[]> {
  const res = await fetch(`${GEMINI_URL}?pageSize=100`, {
    signal,
    headers: { "x-goog-api-key": apiKey },
  });
  if (!res.ok) {
    throw new GeminiError(`gemini_${res.status}`, res.status, false, (await res.text()).slice(0, 200));
  }
  const data = await res.json();
  return ((data?.models ?? []) as { name: string; supportedGenerationMethods?: string[] }[])
    .filter((m) => (m.supportedGenerationMethods ?? []).includes("generateContent"))
    .map((m) => m.name.replace(/^models\//, ""));
}

/** Bitta urinish chegarasi — osilib qolgan chaqiruv butun byudjetni yemasin. */
const ATTEMPT_TIMEOUT_MS = 10_000;

/**
 * Fikrlashni cheklash parametri model oilasiga qarab boshqacha ataladi:
 * 2.5 — `thinkingBudget`, 3.x — `thinkingLevel`. `gemini-flash-latest` qaysi
 * oilaga ishora qilishi vaqt o'tishi bilan o'zgaradi, shuning uchun nomni
 * qattiq belgilamaymiz: 400 kelsa keyingi variantga o'tamiz va tanlovni
 * shu instance uchun eslab qolamiz (keyingi so'rovlar darhol to'g'risini oladi).
 */
const THINKING_VARIANTS: (Record<string, unknown> | null)[] = [
  { thinkingLevel: "low" },
  { thinkingBudget: 0 },
  null, // qo'llab-quvvatlamaydigan model — parametrsiz yuboramiz
];
let thinkingVariant = 0;

/** Fikrlash parametri tufayli 400 kelgan bo'lsa — keyingi variantga o'tadi. */
function nextThinkingVariant(): boolean {
  if (thinkingVariant >= THINKING_VARIANTS.length - 1) return false;
  thinkingVariant++;
  console.warn("thinking_variant_switched", thinkingVariant);
  return true;
}

/** Umumiy byudjetdan qisqaroq, o'z chegarasi bo'lgan signal. */
function withDeadline(parent: AbortSignal, ms: number) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(new DOMException("attempt", "TimeoutError")), ms);
  const onParentAbort = () => ac.abort(parent.reason);
  parent.addEventListener("abort", onParentAbort, { once: true });
  return {
    signal: ac.signal,
    release() {
      clearTimeout(timer);
      parent.removeEventListener("abort", onParentAbort);
    },
  };
}

export async function generateContent(opts: CallOptions): Promise<GeminiResult> {
  const deadline = withDeadline(opts.signal, opts.attemptTimeoutMs ?? ATTEMPT_TIMEOUT_MS);
  const thinking =
    opts.thinkingOverride !== undefined
      ? opts.thinkingOverride
      : THINKING_VARIANTS[thinkingVariant];
  let res: Response;

  try {
    res = await fetch(`${GEMINI_URL}/${opts.model}:generateContent`, {
      method: "POST",
      signal: deadline.signal,
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": opts.apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: opts.system }] },
        contents: opts.contents,
        tools: opts.tools.length ? [{ functionDeclarations: opts.tools }] : undefined,
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: opts.maxOutputTokens ?? 2048,
          // Fikrlash minimumga tushiriladi: modellar standart holatda uzoq
          // "o'ylaydi" (sekin + qimmat), ustiga fikrlash tokenlari
          // maxOutputTokens ichidan yeyilib javob bo'sh qolishi mumkin.
          // Do'kon statistikasi savollariga chuqur fikrlash kerak emas.
          ...(thinking ? { thinkingConfig: thinking } : {}),
        },
      }),
    });
  } catch (e) {
    // Umumiy byudjet tugagan — qayta urinish behuda, yuqoriga uzatamiz.
    if (opts.signal.aborted) throw e;
    // Faqat shu urinish cho'zildi — qayta urinsa bo'ladi.
    throw new GeminiError("gemini_attempt_timeout", 504, true, "urinish vaqti tugadi");
  } finally {
    deadline.release();
  }

  if (!res.ok) {
    const raw = await res.text();
    console.error("gemini_http", res.status, raw.slice(0, 600));
    // Google xatosining o'qiladigan qismi (status kodi bilan birga sabab beradi:
    // 404 = model nomi, 400 = so'rov shakli, 403 = kalit/API huquqi).
    let detail = raw.slice(0, 200);
    try {
      detail = JSON.parse(raw)?.error?.message?.slice(0, 200) ?? detail;
    } catch {
      // JSON emas — xom matn qoladi
    }
    throw new GeminiError(
      `gemini_${res.status}`,
      res.status,
      res.status === 429 || res.status >= 500,
      detail,
    );
  }

  const data = await res.json();
  const candidate = data?.candidates?.[0];

  return {
    content: candidate?.content ?? null,
    finishReason: candidate?.finishReason,
    usage: {
      input: data?.usageMetadata?.promptTokenCount ?? 0,
      output: data?.usageMetadata?.candidatesTokenCount ?? 0,
    },
  };
}

/** Abort'ni hurmat qiladigan kutish. */
const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(t);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });

/**
 * Qayta urinish + zaxira model.
 *
 * Tekin tier'da 503 ("model band") va 429 muntazam uchraydi — bir marta
 * urinib taslim bo'lish foydalanuvchiga asossiz xato ko'rsatadi. Avval o'sha
 * model qayta so'raladi (eksponensial kutish + jitter), keyin zaxira modelga
 * o'tiladi (lite variantda sig'im ko'proq).
 */
export async function generateWithRetry(
  opts: Omit<CallOptions, "model"> & { models: string[] },
): Promise<GeminiResult & { model: string }> {
  const ATTEMPTS = 2;
  let lastError: unknown;

  for (const model of opts.models) {
    for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
      try {
        return { ...(await generateContent({ ...opts, model })), model };
      } catch (e) {
        // 400 — ehtimol fikrlash parametrining nomi bu modelga to'g'ri kelmadi.
        // Keyingi variantga o'tib, shu urinishni qaytadan bajaramiz.
        if (e instanceof GeminiError && e.status === 400 && nextThinkingVariant()) {
          attempt--;
          continue;
        }
        // Qayta urinib bo'lmaydigan xato (400, 404, 403) — darhol chiqamiz.
        if (!(e instanceof GeminiError) || !e.retryable) throw e;
        lastError = e;
        if (attempt < ATTEMPTS - 1) {
          await sleep(600 * 2 ** attempt + Math.random() * 250, opts.signal);
        }
      }
    }
    console.warn("gemini_model_exhausted", model);
  }

  throw lastError;
}

/**
 * Oqim hodisasi.
 *
 * `part` — Gemini bergan bo'lak XOM holida (`thoughtSignature` bilan birga).
 * Uni ajratib qayta qurish mumkin emas: 3.x modellari tool tarixida imzoni
 * talab qiladi.
 */
export type StreamEvent =
  | { type: "part"; part: GeminiPart }
  | { type: "usage"; input: number; output: number };

/**
 * Oqimli generatsiya (`streamGenerateContent?alt=sse`).
 *
 * Bu yerda `withDeadline` ATAYIN ishlatilmaydi: oqim uzun bo'lishi tabiiy va
 * har urinish uchun qat'iy 10 s chegara javobni o'rtasidan kesib qo'yardi.
 * Umumiy byudjet (`opts.signal`) baribir amal qiladi.
 */
export async function* streamGenerate(opts: CallOptions): AsyncGenerator<StreamEvent> {
  const thinking =
    opts.thinkingOverride !== undefined
      ? opts.thinkingOverride
      : THINKING_VARIANTS[thinkingVariant];

  const res = await fetch(`${GEMINI_URL}/${opts.model}:streamGenerateContent?alt=sse`, {
    method: "POST",
    signal: opts.signal,
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": opts.apiKey,
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: opts.system }] },
      contents: opts.contents,
      tools: opts.tools.length ? [{ functionDeclarations: opts.tools }] : undefined,
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: opts.maxOutputTokens ?? 2048,
        ...(thinking ? { thinkingConfig: thinking } : {}),
      },
    }),
  });

  if (!res.ok) {
    const raw = await res.text();
    console.error("gemini_stream_http", res.status, raw.slice(0, 600));
    let detail = raw.slice(0, 200);
    try {
      detail = JSON.parse(raw)?.error?.message?.slice(0, 200) ?? detail;
    } catch {
      // JSON emas
    }
    throw new GeminiError(`gemini_${res.status}`, res.status, res.status !== 400, detail);
  }
  if (!res.body) throw new GeminiError("gemini_no_body", 502, true);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    // SSE: hodisalar `\n` bilan ajraladi; oxirgi to'liqmas qator buferda qoladi.
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;

      let chunk: Record<string, unknown>;
      try {
        chunk = JSON.parse(payload);
      } catch {
        continue; // yarim kelgan bo'lak — keyingi o'qishda to'liq bo'ladi
      }

      const candidate = (chunk as { candidates?: { content?: GeminiContent }[] })
        .candidates?.[0];
      for (const part of candidate?.content?.parts ?? []) {
        yield { type: "part", part };
      }

      const usage = (chunk as {
        usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
      }).usageMetadata;
      if (usage) {
        yield {
          type: "usage",
          input: usage.promptTokenCount ?? 0,
          output: usage.candidatesTokenCount ?? 0,
        };
      }
    }
  }
}

/** Javobdagi barcha matn bo'laklari. */
export const textOf = (c: GeminiContent | null): string =>
  (c?.parts ?? [])
    .map((p) => p.text ?? "")
    .join("")
    .trim();

/** Javobdagi funksiya chaqiruvlari (parallel bo'lishi mumkin). */
export const callsOf = (c: GeminiContent | null) =>
  (c?.parts ?? [])
    .map((p) => p.functionCall)
    .filter((f): f is NonNullable<GeminiPart["functionCall"]> => Boolean(f?.name));
