import { NativeModules, Platform } from "react-native";

const { NfcHceModule } = NativeModules as {
  NfcHceModule?: {
    setActivePayload(hexString: string): Promise<boolean>;
    clearActivePayload(): Promise<boolean>;
    isHceSupported(): Promise<boolean>;
  };
};

/** Cihaz, telefonu kart gibi okutma (HCE) destekliyor mu? */
export async function isHceSupported(): Promise<boolean> {
  if (Platform.OS !== "android" || !NfcHceModule) return false;
  try {
    return await NfcHceModule.isHceSupported();
  } catch {
    return false;
  }
}

/** Bu kaydı "aktif" yapar: telefon artık bu veriyle bir NFC etiketi gibi okutulabilir. */
export async function setActiveCard(ndefHex: string): Promise<void> {
  if (Platform.OS !== "android" || !NfcHceModule) {
    throw new Error("Bu özellik sadece Android'de kullanılabilir.");
  }
  await NfcHceModule.setActivePayload(ndefHex);
}

/** Aktif kartı kaldırır; telefon artık okutulduğunda bir şey döndürmez. */
export async function clearActiveCard(): Promise<void> {
  if (Platform.OS !== "android" || !NfcHceModule) return;
  await NfcHceModule.clearActivePayload();
}
