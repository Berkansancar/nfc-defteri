import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { RootStackParamList } from "../navigation/RootNavigator";
import { getScan } from "../db";
import { writeNdefToBlankTag, cancelScan } from "../nfc";
import type { ScanRecord } from "../types";

type Props = NativeStackScreenProps<RootStackParamList, "Write">;

export default function WriteScreen({ route, navigation }: Props) {
  const { id } = route.params;
  const [record, setRecord] = useState<ScanRecord | null>(null);
  const [writing, setWriting] = useState(false);

  useEffect(() => {
    getScan(id).then(setRecord);
    return () => {
      cancelScan();
    };
  }, [id]);

  async function handleWrite() {
    if (!record?.ndefHex) return;
    setWriting(true);
    try {
      await writeNdefToBlankTag(record.ndefHex);
      Alert.alert("Yazıldı", "Veri yeni etikete başarıyla yazıldı.", [
        { text: "Tamam", onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert(
        "Yazılamadı",
        "Etiket boş/yazılabilir değil olabilir, ya da kilitli. Başka bir etiketle dene."
      );
    } finally {
      setWriting(false);
    }
  }

  if (!record) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>"{record.label}" içeriğini yaz</Text>
      <Text style={styles.subtitle}>
        Boş, yazılabilir bir NFC etiketini telefonun arkasına yaklaştır ve
        aşağıdaki düğmeye bas.
      </Text>

      <Pressable
        style={[styles.button, writing && styles.buttonDisabled]}
        onPress={handleWrite}
        disabled={writing}
      >
        {writing ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Etiketi Okut ve Yaz</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: "#f8fafc", justifyContent: "center", gap: 20 },
  title: { fontSize: 20, fontWeight: "700", color: "#0f172a", textAlign: "center" },
  subtitle: { fontSize: 14, color: "#475569", textAlign: "center" },
  button: {
    backgroundColor: "#1e40af",
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
