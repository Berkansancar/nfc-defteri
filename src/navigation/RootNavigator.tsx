import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import HomeScreen from "../screens/HomeScreen";
import ListScreen from "../screens/ListScreen";
import DetailScreen from "../screens/DetailScreen";
import WriteScreen from "../screens/WriteScreen";
import QrScreen from "../screens/QrScreen";
import FlipperExportScreen from "../screens/FlipperExportScreen";

export type RootStackParamList = {
  Home: undefined;
  List: undefined;
  Detail: { id: number };
  Write: { id: number };
  Qr: undefined;
  FlipperExport: { id: number };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerStyle: { backgroundColor: "#1e40af" },
          headerTintColor: "#ffffff",
          headerTitleStyle: { fontWeight: "600" },
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: "NFC Defterim" }}
        />
        <Stack.Screen
          name="List"
          component={ListScreen}
          options={{ title: "Kayıtlı Kartlar" }}
        />
        <Stack.Screen
          name="Detail"
          component={DetailScreen}
          options={{ title: "Kart Detayı" }}
        />
        <Stack.Screen
          name="Write"
          component={WriteScreen}
          options={{ title: "Boş Etikete Yaz" }}
        />
        <Stack.Screen
          name="Qr"
          component={QrScreen}
          options={{ title: "QR Kod Oluştur" }}
        />
        <Stack.Screen
          name="FlipperExport"
          component={FlipperExportScreen}
          options={{ title: "Flipper Zero'ya Aktar" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
