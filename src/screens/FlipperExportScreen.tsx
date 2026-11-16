import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { RootStackParamList } from "../navigation/RootNavigator";
import { getScan } from "../db";
import { readRawUltralightDump, cancelScan } from "../nfc";
import { buildFlipperNfcFile } from "../flipper";
import type { ScanRecord } from "../types";

type Props = NativeStackScreenProps<RootStackParamList, "FlipperExport">;

export default function FlipperExportScreen({ route }: Props) {
  const { id } = route.params;
  const [record, setRecord] = useState<ScanRecord | null>(null);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    getScan(id).then(setRecord);
    return () => {
      cancelScan();
    };
  }, [id]);

  async function handleExport() {
    setWorking(true);
    try {
      const dump = await readRawUltralightDump();
      const content = buildFlipperNfcFile(dump);
      const fileName = `${(record?.label || "etiket").replace(/[^a-zA-Z0-9-_]/g, "_")}.nfc`;
      const path = FileSystem.documentDirectory + fileName;
      await FileSystem.writeAsStringAsync(path, content, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(path, {
          mimeType: "text/plain",
          dialogTitle: "Flipper Zero dosyasını paylaş",
        });
      } else {
        Alert.alert("Oluşturuldu", `Dosya kaydedildi: ${path}`);
      }
    } catch (e: any) {
      Alert.alert(
        "Olmadı",
        "Aynı fiziksel etiketi tekrar okutman gerekiyor. Etiketi telefonun arkasına yaklaştır ve tekrar dene."
      );
    } finally {
      setWorking(false);
    }
  }

  if (!record) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>"{record.label}" için Flipper dosyası</Text>
      <Text style={styles.subtitle}>
        Bu, en iyi gayret bir dışa aktarımdır: sadece etiketten gerçekten
        okunan sayfalar yazılır, hiçbir veri uydurulmaz. Bazı Flipper
        sürümleri ek alanlar (Signature, Counter) bekleyebilir — dosya
        Flipper'a aktarılamazsa bu normaldir.
      </Text>
      <Text style={styles.subtitle}>
        Kayıtlı etiketin AYNI fiziksel kartını/etiketini telefonun arkasına
        yaklaştır ve aşağıdaki düğmeye bas.
      </Text>

      <Pressable
        style={[styles.button, working && styles.buttonDisabled]}
        onPress={handleExport}
        disabled={working}
      >
        {working ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Etiketi Okut ve Dosya Oluştur</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: "#f8fafc", justifyContent: "center", gap: 16 },
  title: { fontSize: 19, fontWeight: "700", color: "#0f172a", textAlign: "center" },
  subtitle: { fontSize: 13, color: "#475569", textAlign: "center" },
  button: {
    backgroundColor: "#1e40af",
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
