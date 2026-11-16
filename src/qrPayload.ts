export type QrType = "text" | "link" | "wifi" | "contact" | "phone" | "sms" | "location";

export interface WifiFields {
  ssid: string;
  password: string;
  security: "WPA" | "WEP" | "nopass";
}

export interface ContactFields {
  name: string;
  phone: string;
  email: string;
}

function escapeWifi(value: string): string {
  return value.replace(/([\\;,:"])/g, "\\$1");
}

export function buildQrValue(
  type: QrType,
  text: string,
  wifi: WifiFields,
  contact: ContactFields
): string {
  switch (type) {
    case "text":
      return text;
    case "link":
      if (/^https?:\/\//i.test(text)) return text;
      return text ? `https://${text}` : "";
    case "wifi":
      return `WIFI:T:${wifi.security};S:${escapeWifi(wifi.ssid)};${
        wifi.security === "nopass" ? "" : `P:${escapeWifi(wifi.password)};`
      }H:false;;`;
    case "contact":
      return [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `FN:${contact.name}`,
        contact.phone ? `TEL:${contact.phone}` : "",
        contact.email ? `EMAIL:${contact.email}` : "",
        "END:VCARD",
      ]
        .filter(Boolean)
        .join("\n");
    case "phone":
      return `tel:${text}`;
    case "sms":
      return `sms:${text}`;
    case "location":
      return `geo:${text}`;
    default:
      return text;
  }
}

export const QR_TYPE_LABELS: Record<QrType, string> = {
  text: "Metin",
  link: "Bağlantı",
  wifi: "Wi-Fi",
  contact: "Kişi",
  phone: "Telefon",
  sms: "SMS",
  location: "Konum",
};
