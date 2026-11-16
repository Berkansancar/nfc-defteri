import type { RawUltralightDump } from "./nfc";

/**
 * Flipper Zero .nfc dosyası (Mifare Ultralight/NTAG ailesi için) üretir.
 * Sadece GERÇEKTEN okunan sayfa verisini yazar; Signature, Version veya
 * Counter gibi ek alanları bilmediğimiz için eklemez (bunları uydurmak,
 * dosyayı Flipper'da yanlış/eksik görünür hale getirebilir). Bu yüzden
 * "en iyi gayret" bir dışa aktarımdır — gerçek cihazda test edilmelidir.
 */
export function buildFlipperNfcFile(dump: RawUltralightDump): string {
  const pageCount = dump.pages.length;

  let deviceType = "Mifare Ultralight";
  if (pageCount >= 225) deviceType = "NTAG216";
  else if (pageCount >= 130) deviceType = "NTAG215";
  else if (pageCount >= 40) deviceType = "NTAG213";

  const lines: string[] = [
    "Filetype: Flipper NFC device",
    "Version: 2",
    "# Bu dosya NFC Defterim tarafından, etiketten gerçekten okunan",
    "# verilerle oluşturuldu. Signature/Version/Counter gibi bazı",
    "# alanlar okunmadığı için dosyada yer almıyor.",
    `Device type: ${deviceType}`,
    `UID: ${dump.uidHex.match(/.{1,2}/g)?.join(" ") ?? ""}`,
    `ATQA: ${dump.atqaHex ? dump.atqaHex.match(/.{1,2}/g)?.join(" ") : "bilinmiyor"}`,
    `SAK: ${dump.sakHex ?? "bilinmiyor"}`,
    `Pages total: ${pageCount}`,
  ];

  dump.pages.forEach((page, i) => {
    lines.push(`Page ${i}: ${page.match(/.{1,2}/g)?.join(" ") ?? page}`);
  });

  return lines.join("\n") + "\n";
}
