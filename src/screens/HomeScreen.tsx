import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { RootStackParamList } from "../navigation/RootNavigator";
import { scanTag, cancelScan, initNfc } from "../nfc";
import { insertScan } from "../db";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

export default function HomeScreen({ navigation }: Props) {
  const [scanning, setScanning] = useState(false);
  const [pendingLabel, setPendingLabel] = useState("");
  const [showLabelInput, setShowLabelInput] = useState(false);
  const [pendingResult, setPendingResult] = useState<Awaited<
    ReturnType<typeof scanTag>
  > | null>(null);

  async function handleScan() {
    if (Platform.OS !== "android") {
      Alert.alert("Desteklenmiyor", "Bu özellik şu an yalnızca Android'de çalışıyor.");
      return;
    }
    setScanning(true);
    try {
      const ok = await initNfc();
      if (!ok) {
        Alert.alert("NFC yok", "Bu cihazda NFC desteği bulunamadı.");
        return;
      }
      const result = await scanTag();
      setPendingResult(result);
      setPendingLabel(
        result.kind === "ndef" ? "Yeni NFC Etiketi" : "Yeni Kart"
      );
      setShowLabelInput(true);
    } catch (e: any) {
      Alert.alert(
        "Okuma başarısız",
        "Etiket okunamadı. Telefonu etikete/karta yaklaştırıp tekrar dene."
      );
    } finally {
      setScanning(false);
      await cancelScan();
    }
  }

  async function handleSave() {
    if (!pendingResult) return;
    const label = pendingLabel.trim() || "Adsız Kart";
    await insertScan({
      label,
      kind: pendingResult.kind,
      uidHex: pendingResult.uidHex,
      techTypes: pendingResult.techTypes,
      ndefHex: pendingResult.ndefHex,
      ndefPreview: pendingResult.ndefPreview,
      writable: pendingResult.writable,
    });
    setShowLabelInput(false);
    setPendingResult(null);
    setPendingLabel("");
    Alert.alert("Kaydedildi", `"${label}" kaydedildi.`, [
      { text: "Tamam", onPress: () => navigation.navigate("List") },
    ]);
  }

  function handleDiscard() {
    setShowLabelInput(false);
    setPendingResult(null);
    setPendingLabel("");
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>NFC Defterim</Text>
      <Text style={styles.subtitle}>
        Bir kartı veya etiketi okut, kaydet, sonra tekrar kullan.
      </Text>

      {!showLabelInput && (
        <Pressable
          style={[styles.bigButton, scanning && styles.bigButtonDisabled]}
          onPress={handleScan}
          disabled={scanning}
        >
          {scanning ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.bigButtonText}>Okut ve Kaydet</Text>
          )}
        </Pressable>
      )}

      {showLabelInput && pendingResult && (
        <View style={styles.resultBox}>
          <Text style={styles.resultTitle}>
            {pendingResult.kind === "ndef"
              ? "Okundu: yazılabilir NFC etiketi"
              : "Okundu: kilitli/özel kart"}
          </Text>
          <Text style={styles.resultMeta}>UID: {pendingResult.uidHex}</Text>
          {pendingResult.ndefPreview && (
            <Text style={styles.resultMeta}>
              İçerik: {pendingResult.ndefPreview}
            </Text>
          )}
          {pendingResult.kind === "locked" && (
            <Text style={styles.resultWarning}>
              Bu kart şifreli olduğu için sadece kimlik bilgisi kaydedilecek;
              boş etikete yazma veya telefonla kullanma bu kartta mümkün
              değil.
            </Text>
          )}

          <Text style={styles.inputLabel}>Bu kayda bir isim ver:</Text>
          <TextInput
            style={styles.input}
            value={pendingLabel}
            onChangeText={setPendingLabel}
            placeholder="Örn: Ofis kapı kartı"
          />

          <View style={styles.row}>
            <Pressable style={styles.secondaryButton} onPress={handleDiscard}>
              <Text style={styles.secondaryButtonText}>Vazgeç</Text>
            </Pressable>
            <Pressable style={styles.primaryButton} onPress={handleSave}>
              <Text style={styles.primaryButtonText}>Kaydet</Text>
            </Pressable>
          </View>
        </View>
      )}

      <Pressable
        style={styles.linkButton}
        onPress={() => navigation.navigate("List")}
      >
        <Text style={styles.linkButtonText}>Kayıtlı kartları gör →</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: "#f8fafc" },
  title: { fontSize: 26, fontWeight: "700", color: "#0f172a", marginTop: 12 },
  subtitle: { fontSize: 15, color: "#475569", marginTop: 6, marginBottom: 28 },
  bigButton: {
    backgroundColor: "#1e40af",
    borderRadius: 16,
    paddingVertical: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  bigButtonDisabled: { opacity: 0.6 },
  bigButtonText: { color: "#ffffff", fontSize: 18, fontWeight: "700" },
  resultBox: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  resultTitle: { fontSize: 16, fontWeight: "700", color: "#0f172a" },
  resultMeta: { fontSize: 13, color: "#475569", marginTop: 6 },
  resultWarning: { fontSize: 13, color: "#b45309", marginTop: 10 },
  inputLabel: { marginTop: 16, marginBottom: 6, color: "#0f172a", fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: "#f8fafc",
  },
  row: { flexDirection: "row", gap: 12, marginTop: 18 },
  primaryButton: {
    flex: 1,
    backgroundColor: "#1e40af",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryButtonText: { color: "#ffffff", fontWeight: "700" },
  secondaryButton: {
    flex: 1,
    backgroundColor: "#e2e8f0",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  secondaryButtonText: { color: "#0f172a", fontWeight: "700" },
  linkButton: { marginTop: 28, alignSelf: "center" },
  linkButtonText: { color: "#1e40af", fontWeight: "600", fontSize: 15 },
});
