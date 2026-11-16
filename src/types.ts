// Kaydedilen bir NFC etiketinin/kartının türü.
// - "ndef": Okunabilir/olası yazılabilir NDEF verisi var (boş etikete yazılabilir,
//           kilitsizse telefonla kullanılabilir).
// - "locked": Kart okundu ama içeriği şifreli/özel (örn. kapı kartı, İstanbulkart).
//             Sadece kimlik (UID) bilgisi saklanır, yazma/kullanma kapalıdır.
export type CardKind = "ndef" | "locked";

export interface ScanRecord {
  id: number;
  label: string;
  kind: CardKind;
  uidHex: string;
  techTypes: string; // JSON.stringify(string[])
  ndefHex: string | null; // ham NDEF mesajı, hex string (varsa)
  ndefPreview: string | null; // kullanıcıya gösterilecek kısa önizleme metni
  writable: number; // 0/1 - SQLite boolean
  isActive: number; // 0/1 - şu an telefonla "kullanılan" kayıt mı
  createdAt: string; // ISO tarih
}

export interface NewScanInput {
  label: string;
  kind: CardKind;
  uidHex: string;
  techTypes: string[];
  ndefHex: string | null;
  ndefPreview: string | null;
  writable: boolean;
}
