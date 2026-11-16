import React, { useCallback, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { RootStackParamList } from "../navigation/RootNavigator";
import { deleteScan, getScan, renameScan, setActiveScan, clearActiveScan } from "../db";
import { isHceSupported, setActiveCard, clearActiveCard } from "../hce";
import type { ScanRecord } from "../types";

type Props = NativeStackScreenProps<RootStackParamList, "Detail">;

export default function DetailScreen({ route, navigation }: Props) {
  const { id } = route.params;
  const [record, setRecord] = useState<ScanRecord | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [labelDraft, setLabelDraft] = useState("");
  const [hceOk, setHceOk] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getScan(id).then((r: ScanRecord | null) => {
        setRecord(r);
        setLabelDraft(r?.label ?? "");
      });
      isHceSupported().then(setHceOk);
    }, [id])
  );

  if (!record) return null;

  const canUseDirectly = record.kind === "ndef" && !!record.ndefHex;

  async function handleRename() {
    const label = labelDraft.trim();
    if (!label) return;
    await renameScan(id, label);
    setRenaming(false);
    setRecord((r: ScanRecord | null) => (r ? { ...r, label } : r));
  }

  async function handleDelete() {
    Alert.alert("Silinsin mi?", `"${record.label}" kalıcı olarak silinecek.`, [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "Sil",
        style: "destructive",
        onPress: async () => {
          if (record.isActive) {
            await clearActiveCard().catch(() => {});
          }
          await deleteScan(id);
          navigation.goBack();
        },
      },
    ]);
  }

  async function handleToggleActive() {
    if (!record.ndefHex) return;
    try {
      if (record.isActive) {
        await clearActiveCard();
        await clearActiveScan();
        setRecord((r: ScanRecord | null) => (r ? { ...r, isActive: 0 } : r));
      } else {
        await setActiveCard(record.ndefHex);
        await setActiveScan(id);
        setRecord((r: ScanRecord | null) => (r ? { ...r, isActive: 1 } : r));
        Alert.alert(
          "Aktif edildi",
          "Telefonunu artık bu kartın okutulduğu yerde bir NFC etiketi gibi okutabilirsin. NFC'nin açık olduğundan emin ol."
        );
      }
    } catch (e: any) {
      Alert.alert("Olmadı", e?.message ?? "Aktif edilemedi.");
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {renaming ? (
        <View style={styles.renameRow}>
          <TextInput
            style={styles.renameInput}
            value={labelDraft}
            onChangeText={setLabelDraft}
            autoFocus
          />
          <Pressable style={styles.smallButton} onPress={handleRename}>
            <Text style={styles.smallButtonText}>Kaydet</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable onPress={() => setRenaming(true)}>
          <Text style={styles.title}>{record.label} ✎</Text>
        </Pressable>
      )}

      <View style={styles.infoBox}>
        <Row k="Tür" v={record.kind === "ndef" ? "Yazılabilir NFC etiketi" : "Kilitli/özel kart"} />
        <Row k="UID" v={record.uidHex} />
        <Row k="Teknolojiler" v={JSON.parse(record.techTypes).join(", ")} />
        <Row k="Kaydedilme" v={new Date(record.createdAt).toLocaleString("tr-TR")} />
        {record.ndefPreview && <Row k="İçerik" v={record.ndefPreview} />}
      </View>

      {record.kind === "locked" && (
        <View style={styles.noticeBox}>
          <Text style={styles.noticeText}>
            Bu kart şifreli/özel olduğu için sadece kimlik bilgisi saklandı.
            Boş etikete yazma ve telefonla kullanma bu kartta mümkün değil.
          </Text>
        </View>
      )}

      {canUseDirectly && (
        <>
          <Pressable
            style={styles.primaryButton}
            onPress={() => navigation.navigate("Write", { id })}
          >
            <Text style={styles.primaryButtonText}>Boş etikete yaz</Text>
          </Pressable>

          {hceOk ? (
            <Pressable
              style={[
                styles.primaryButton,
                record.isActive ? styles.dangerButton : styles.successButton,
              ]}
              onPress={handleToggleActive}
            >
              <Text style={styles.primaryButtonText}>
                {record.isActive
                  ? "Telefonla kullanımı kapat"
                  : "Telefonla kullan (aktif yap)"}
              </Text>
            </Pressable>
          ) : (
            <Text style={styles.noticeTextSmall}>
              Bu cihaz telefonu kart gibi okutma (HCE) özelliğini desteklemiyor.
            </Text>
          )}
        </>
      )}

      <Pressable style={styles.deleteButton} onPress={handleDelete}>
        <Text style={styles.deleteButtonText}>Kaydı sil</Text>
      </Pressable>
    </ScrollView>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowKey}>{k}</Text>
      <Text style={styles.rowValue}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: "#f8fafc", gap: 16 },
  title: { fontSize: 22, fontWeight: "700", color: "#0f172a" },
  renameRow: { flexDirection: "row", gap: 8 },
  renameInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 18,
    backgroundColor: "#ffffff",
  },
  smallButton: {
    backgroundColor: "#1e40af",
    borderRadius: 10,
    paddingHorizontal: 14,
    justifyContent: "center",
  },
  smallButtonText: { color: "#fff", fontWeight: "700" },
  infoBox: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 10,
  },
  row: { gap: 2 },
  rowKey: { fontSize: 12, color: "#64748b", fontWeight: "600" },
  rowValue: { fontSize: 15, color: "#0f172a" },
  noticeBox: { backgroundColor: "#fef3c7", borderRadius: 12, padding: 14 },
  noticeText: { color: "#92400e", fontSize: 13 },
  noticeTextSmall: { color: "#64748b", fontSize: 13, textAlign: "center" },
  primaryButton: {
    backgroundColor: "#1e40af",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  successButton: { backgroundColor: "#15803d" },
  dangerButton: { backgroundColor: "#b91c1c" },
  primaryButtonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  deleteButton: { alignItems: "center", paddingVertical: 10 },
  deleteButtonText: { color: "#b91c1c", fontWeight: "600" },
});
