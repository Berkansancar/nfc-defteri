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
import {
  deleteScan,
  getScan,
  renameScan,
  setActiveScan,
  clearActiveScan,
  updateScanContent,
} from "../db";
import { isHceSupported, setActiveCard, clearActiveCard } from "../hce";
import { makeTagReadOnly, buildTextNdefHex, writeNdefToBlankTag } from "../nfc";
import type { ScanRecord } from "../types";

type Props = NativeStackScreenProps<RootStackParamList, "Detail">;

export default function DetailScreen({ route, navigation }: Props) {
  const { id } = route.params;
  const [record, setRecord] = useState<ScanRecord | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [labelDraft, setLabelDraft] = useState("");
  const [hceOk, setHceOk] = useState(false);
  const [locking, setLocking] = useState(false);
  const [freeText, setFreeText] = useState("");
  const [writingFreeText, setWritingFreeText] = useState(false);

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
  const isEmptyWritable = record.kind === "ndef" && !record.ndefHex;
  const techList: string[] = (() => {
    try {
      return JSON.parse(record.techTypes);
    } catch {
      return [];
    }
  })();
  const isUltralightFamily = techList.some((t) => t.includes("MifareUltralight"));

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

  async function handleWriteFreeText() {
    const text = freeText.trim();
    if (!text) return;
    setWritingFreeText(true);
    try {
      const ndefHex = buildTextNdefHex(text);
      await writeNdefToBlankTag(ndefHex);
      await updateScanContent(id, ndefHex, text);
      setRecord((r: ScanRecord | null) =>
        r ? { ...r, ndefHex, ndefPreview: text, writable: 1 } : r
      );
      setFreeText("");
      Alert.alert("Yazıldı", "Veri etikete yazıldı ve kayda eklendi.");
    } catch (e: any) {
      Alert.alert(
        "Olmadı",
        "Yazılamadı. Aynı etiketi telefonun arkasına yaklaştırıp tekrar dene."
      );
    } finally {
      setWritingFreeText(false);
    }
  }

  function handleLock() {
    Alert.alert(
      "Kalıcı kilitleme",
      "Bu etiket bir daha hiçbir şekilde değiştirilemeyecek. Bu işlem GERİ ALINAMAZ. Devam edilsin mi?",
      [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "Kalıcı olarak kilitle",
          style: "destructive",
          onPress: async () => {
            setLocking(true);
            try {
              await makeTagReadOnly();
              Alert.alert("Kilitlendi", "Etiket artık kalıcı olarak salt-okunur.");
            } catch (e: any) {
              Alert.alert(
                "Olmadı",
                "Etiket kilitlenemedi. Doğru etiketi okuttuğundan emin ol ve tekrar dene."
              );
            } finally {
              setLocking(false);
            }
          },
        },
      ]
    );
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
        <Row
          k="Tür"
          v={
            canUseDirectly
              ? "Yazılabilir NFC etiketi (içerik kayıtlı)"
              : isEmptyWritable
              ? "Boş ama yazılabilir etiket"
              : "Kilitli/özel kart"
          }
        />
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

      {isEmptyWritable && (
        <View style={styles.infoBox}>
          <Text style={styles.resultTitleLike}>
            Bu etiket şu an boş — üzerinde kopyalanacak bir veri yok. Ama
            yazılabilir olduğu için üzerine bir şey yazabilirsin:
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Metin veya bağlantı yaz"
            value={freeText}
            onChangeText={setFreeText}
          />
          <Pressable
            style={[styles.primaryButton, writingFreeText && styles.disabled]}
            onPress={handleWriteFreeText}
            disabled={writingFreeText}
          >
            <Text style={styles.primaryButtonText}>
              {writingFreeText ? "Yazılıyor…" : "Aynı etikete şimdi yaz"}
            </Text>
          </Pressable>
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

          {isUltralightFamily && (
            <Pressable
              style={styles.secondaryOutlineButton}
              onPress={() => navigation.navigate("FlipperExport", { id })}
            >
              <Text style={styles.secondaryOutlineButtonText}>
                Flipper Zero dosyası oluştur (.nfc)
              </Text>
            </Pressable>
          )}

          <Pressable
            style={[styles.dangerOutlineButton, locking && styles.disabled]}
            onPress={handleLock}
            disabled={locking}
          >
            <Text style={styles.dangerOutlineButtonText}>
              {locking ? "Kilitleniyor…" : "Kalıcı olarak kilitle"}
            </Text>
          </Pressable>
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
  disabled: { opacity: 0.6 },
  secondaryOutlineButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1e40af",
    backgroundColor: "#ffffff",
  },
  secondaryOutlineButtonText: { color: "#1e40af", fontWeight: "700", fontSize: 14 },
  dangerOutlineButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#b91c1c",
    backgroundColor: "#ffffff",
  },
  dangerOutlineButtonText: { color: "#b91c1c", fontWeight: "700", fontSize: 14 },
  resultTitleLike: { fontSize: 14, color: "#0f172a", fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: "#f8fafc",
  },
});
