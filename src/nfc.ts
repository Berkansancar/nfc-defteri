import NfcManager, { Ndef, NfcTech, TagEvent } from "react-native-nfc-manager";

export function bytesToHex(bytes: number[] | Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function hexToBytes(hex: string): number[] {
  const out: number[] = [];
  for (let i = 0; i < hex.length; i += 2) {
    out.push(parseInt(hex.slice(i, i + 2), 16));
  }
  return out;
}

let started = false;

export async function initNfc(): Promise<boolean> {
  if (started) return true;
  const supported = await NfcManager.isSupported();
  if (!supported) return false;
  await NfcManager.start();
  started = true;
  return true;
}

export async function isNfcEnabled(): Promise<boolean> {
  try {
    return await NfcManager.isEnabled();
  } catch {
    return false;
  }
}

export interface ScanResult {
  kind: "ndef" | "locked";
  uidHex: string;
  techTypes: string[];
  ndefHex: string | null;
  ndefPreview: string | null;
  writable: boolean;
}

function buildPreview(tag: TagEvent): string | null {
  const records = tag.ndefMessage;
  if (!records || records.length === 0) return null;
  try {
    const first = records[0];
    // Metin kaydı mı?
    const text = Ndef.text.decodePayload(Uint8Array.from(first.payload as number[]));
    if (text) return text;
  } catch {
    // metin değilse devam
  }
  try {
    const first = records[0];
    const uri = Ndef.uri.decodePayload(Uint8Array.from(first.payload as number[]));
    if (uri) return uri;
  } catch {
    // uri değilse devam
  }
  return `${records.length} veri kaydı`;
}

async function readUidAndTech(): Promise<{ uidHex: string; techTypes: string[] }> {
  const tag = await NfcManager.getTag();
  const uidHex = (tag?.id ?? "").toString().toLowerCase();
  const techTypes = (tag?.techTypes as string[] | undefined) ?? [];
  return { uidHex, techTypes };
}

/**
 * Telefonu bir etikete/karta okutup sonucu sınıflandırır.
 * Önce NDEF olarak okumayı dener; başarısız olursa (kilitli/özel kart)
 * sadece kimlik bilgisini (UID) okuyup "locked" olarak işaretler.
 */
export async function scanTag(): Promise<ScanResult> {
  await initNfc();

  // 1) Önce NDEF dene
  try {
    await NfcManager.requestTechnology(NfcTech.Ndef);
    const tag = await NfcManager.getTag();
    const uidHex = (tag?.id ?? "").toString().toLowerCase();
    const techTypes = (tag?.techTypes as string[] | undefined) ?? [];

    let ndefHex: string | null = null;
    let preview: string | null = null;
    if (tag?.ndefMessage && tag.ndefMessage.length > 0) {
      const bytes = Ndef.encodeMessage(tag.ndefMessage as any);
      if (bytes) ndefHex = bytesToHex(bytes);
      preview = buildPreview(tag);
    }

    const writable = Boolean((tag as any)?.isWritable ?? true);

    await NfcManager.cancelTechnologyRequest();

    return {
      kind: "ndef",
      uidHex,
      techTypes,
      ndefHex,
      ndefPreview: preview,
      writable: ndefHex != null && writable,
    };
  } catch {
    await NfcManager.cancelTechnologyRequest().catch(() => {});
  }

  // 2) NDEF olmadı — sadece kimlik bilgisini oku (kapı kartı, İstanbulkart vb.)
  try {
    await NfcManager.requestTechnology(NfcTech.NfcA);
    const { uidHex, techTypes } = await readUidAndTech();
    await NfcManager.cancelTechnologyRequest();
    return {
      kind: "locked",
      uidHex,
      techTypes,
      ndefHex: null,
      ndefPreview: null,
      writable: false,
    };
  } catch (e) {
    await NfcManager.cancelTechnologyRequest().catch(() => {});
    throw e;
  }
}

/** Düz metin/bağlantıdan bir NDEF mesajı (hex) üretir. */
export function buildTextNdefHex(text: string): string {
  const record = Ndef.textRecord(text);
  const bytes = Ndef.encodeMessage([record]);
  return bytes ? bytesToHex(bytes) : "";
}

/** Kaydedilmiş bir NDEF verisini boş/yazılabilir bir etikete yazar. */
export async function writeNdefToBlankTag(ndefHex: string): Promise<void> {
  await initNfc();
  const bytes = hexToBytes(ndefHex);
  try {
    await NfcManager.requestTechnology(NfcTech.Ndef);
    await (NfcManager as any).ndefHandler.writeNdefMessage(bytes);
  } finally {
    await NfcManager.cancelTechnologyRequest().catch(() => {});
  }
}

export async function cancelScan(): Promise<void> {
  await NfcManager.cancelTechnologyRequest().catch(() => {});
}

/**
 * Bir etiketi kalıcı olarak salt-okunur yapar. GERİ ALINAMAZ.
 * Etiket zaten kilitliyse veya bu işlemi desteklemiyorsa hata fırlatır.
 */
export async function makeTagReadOnly(): Promise<void> {
  await initNfc();
  try {
    await NfcManager.requestTechnology(NfcTech.Ndef);
    await (NfcManager as any).ndefHandler.makeReadOnly();
  } finally {
    await NfcManager.cancelTechnologyRequest().catch(() => {});
  }
}

export interface RawUltralightDump {
  uidHex: string;
  atqaHex: string | null;
  sakHex: string | null;
  pages: string[]; // her biri 4 byte'lık hex sayfa
}

/**
 * Mifare Ultralight/NTAG ailesi bir etiketten GERÇEKTEN okunan ham sayfa
 * verisini döndürür. Hiçbir baytı tahmin etmez/uydurmaz — okuma sayfa
 * sınırına ulaştığında (etiketin sonu) veya hata aldığında durur.
 */
export async function readRawUltralightDump(): Promise<RawUltralightDump> {
  await initNfc();
  try {
    await NfcManager.requestTechnology(NfcTech.MifareUltralight);
    const tag = await NfcManager.getTag();
    const uidHex = (tag?.id ?? "").toString().toLowerCase();

    let atqaHex: string | null = null;
    const atqa = (tag as any)?.atqa;
    if (Array.isArray(atqa)) atqaHex = bytesToHex(atqa);

    let sakHex: string | null = null;
    const sak = (tag as any)?.sak;
    if (typeof sak === "number") sakHex = sak.toString(16).padStart(2, "0");

    const handler = (NfcManager as any).mifareUltralightHandlerAndroid;
    const pages: string[] = [];
    let offset = 0;
    const MAX_PAGES = 256; // güvenlik sınırı (en büyük NTAG216 231 sayfa)
    while (offset < MAX_PAGES) {
      try {
        const chunk: number[] = await handler.mifareUltralightReadPages(offset);
        for (let i = 0; i < chunk.length; i += 4) {
          pages.push(bytesToHex(chunk.slice(i, i + 4)));
        }
        offset += 4;
      } catch {
        break; // etiketin sonuna gelindi
      }
    }

    return { uidHex, atqaHex, sakHex, pages };
  } finally {
    await NfcManager.cancelTechnologyRequest().catch(() => {});
  }
}
