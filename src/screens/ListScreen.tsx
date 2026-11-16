import React, { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { RootStackParamList } from "../navigation/RootNavigator";
import { listScans } from "../db";
import type { ScanRecord } from "../types";

type Props = NativeStackScreenProps<RootStackParamList, "List">;

export default function ListScreen({ navigation }: Props) {
  const [items, setItems] = useState<ScanRecord[]>([]);

  useFocusEffect(
    useCallback(() => {
      listScans().then(setItems);
    }, [])
  );

  if (items.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>
          Henüz kayıtlı kart yok. Ana ekrandan bir kart okut.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      contentContainerStyle={styles.list}
      data={items}
      keyExtractor={(item: ScanRecord) => String(item.id)}
      renderItem={({ item }: { item: ScanRecord }) => (
        <Pressable
          style={styles.card}
          onPress={() => navigation.navigate("Detail", { id: item.id })}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardLabel}>{item.label}</Text>
            <View
              style={[
                styles.badge,
                item.kind === "ndef" ? styles.badgeOk : styles.badgeLocked,
              ]}
            >
              <Text style={styles.badgeText}>
                {item.kind === "ndef" ? "Yazılabilir" : "Kilitli"}
              </Text>
            </View>
          </View>
          <Text style={styles.cardMeta}>UID: {item.uidHex}</Text>
          <Text style={styles.cardMeta}>
            {new Date(item.createdAt).toLocaleString("tr-TR")}
          </Text>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 12 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  emptyText: { color: "#64748b", fontSize: 15, textAlign: "center" },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardLabel: { fontSize: 16, fontWeight: "700", color: "#0f172a" },
  cardMeta: { fontSize: 12, color: "#64748b", marginTop: 4 },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  badgeOk: { backgroundColor: "#dcfce7" },
  badgeLocked: { backgroundColor: "#fef3c7" },
  badgeText: { fontSize: 11, fontWeight: "700", color: "#0f172a" },
});
