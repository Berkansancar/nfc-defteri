import React, { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";

import {
  buildQrValue,
  QR_TYPE_LABELS,
  QrType,
  WifiFields,
  ContactFields,
} from "../qrPayload";

const TYPES: QrType[] = ["text", "link", "wifi", "contact", "phone", "sms", "location"];

export default function QrScreen() {
  const [type, setType] = useState<QrType>("text");
  const [text, setText] = useState("");
  const [wifi, setWifi] = useState<WifiFields>({
    ssid: "",
    password: "",
    security: "WPA",
  });
  const [contact, setContact] = useState<ContactFields>({
    name: "",
    phone: "",
    email: "",
  });

  const value = buildQrValue(type, text, wifi, contact);
  const hasValue = value.trim().length > 0;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.label}>Tür seç</Text>
      <View style={styles.typeRow}>
        {TYPES.map((t) => (
          <Pressable
            key={t}
            style={[styles.typeChip, type === t && styles.typeChipActive]}
            onPress={() => setType(t)}
          >
            <Text
              style={[
                styles.typeChipText,
                type === t && styles.typeChipTextActive,
              ]}
            >
              {QR_TYPE_LABELS[t]}
            </Text>
          </Pressable>
        ))}
      </View>

      {type === "wifi" ? (
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Ağ adı (SSID)"
            value={wifi.ssid}
            onChangeText={(v: string) => setWifi((w: WifiFields) => ({ ...w, ssid: v }))}
          />
          <TextInput
            style={styles.input}
            placeholder="Şifre"
            secureTextEntry
            value={wifi.password}
            onChangeText={(v: string) => setWifi((w: WifiFields) => ({ ...w, password: v }))}
          />
        </View>
      ) : type === "contact" ? (
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Ad Soyad"
            value={contact.name}
            onChangeText={(v: string) => setContact((c: ContactFields) => ({ ...c, name: v }))}
          />
          <TextInput
            style={styles.input}
            placeholder="Telefon"
            value={contact.phone}
            onChangeText={(v: string) => setContact((c: ContactFields) => ({ ...c, phone: v }))}
          />
          <TextInput
            style={styles.input}
            placeholder="E-posta"
            value={contact.email}
            onChangeText={(v: string) => setContact((c: ContactFields) => ({ ...c, email: v }))}
          />
        </View>
      ) : (
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder={
              type === "link"
                ? "ornek.com"
                : type === "phone"
                ? "+905xxxxxxxxx"
                : type === "sms"
                ? "+905xxxxxxxxx"
                : type === "location"
                ? "41.0082,28.9784"
                : "Metin yaz"
            }
            value={text}
            onChangeText={setText}
            autoCapitalize="none"
          />
        </View>
      )}

      <View style={styles.qrBox}>
        {hasValue ? (
          <QRCode value={value} size={220} />
        ) : (
          <Text style={styles.hint}>Önizleme için bilgileri doldur</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: "#f8fafc", gap: 16, alignItems: "stretch" },
  label: { fontSize: 13, fontWeight: "700", color: "#64748b" },
  typeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#e2e8f0",
  },
  typeChipActive: { backgroundColor: "#1e40af" },
  typeChipText: { color: "#0f172a", fontWeight: "600", fontSize: 13 },
  typeChipTextActive: { color: "#ffffff" },
  form: { gap: 10 },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: "#ffffff",
  },
  qrBox: {
    marginTop: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingVertical: 32,
  },
  hint: { color: "#94a3b8", fontSize: 13 },
});
