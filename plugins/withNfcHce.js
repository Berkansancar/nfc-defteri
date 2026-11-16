/**
 * Expo config plugin: Android için Host Card Emulation (HCE) desteği ekler.
 * "expo prebuild" sırasında çalışır; native Kotlin servis/modül dosyalarını
 * oluşturur ve AndroidManifest.xml'e gerekli servis/izin girişlerini ekler.
 *
 * Böylece "telefonu kart gibi okutma" özelliği, kilitsiz/yazılabilir NDEF
 * etiketleri için çalışabilir (kapı kartı/İstanbulkart gibi şifreli kartlar
 * için zaten devre dışı bırakılmış durumda — bkz. src/hce.ts).
 */
const { withAndroidManifest, withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

const PACKAGE_NAME = "com.berkansancar.nfcdefteri";

const APDU_SERVICE_XML = `<?xml version="1.0" encoding="utf-8"?>
<host-apdu-service xmlns:android="http://schemas.android.com/apk/res/android"
    android:description="@string/app_name"
    android:requireDeviceUnlock="false">
    <aid-group android:description="@string/app_name" android:category="other">
        <aid-filter android:name="D2760000850101"/>
    </aid-group>
</host-apdu-service>
`;

const HCE_SERVICE_KT = `package ${PACKAGE_NAME}

import android.nfc.cardemulation.HostApduService
import android.os.Bundle
import java.io.File

/**
 * Standart NFC Forum Type 4 Tag öykünmesi (basitleştirilmiş).
 * Telefon, "active_ndef.bin" dosyasında saklanan NDEF mesajını,
 * normal bir NFC etiketi gibi okutulduğunda döndürür.
 */
class NfcHceService : HostApduService() {

    companion object {
        private const val FILE_NAME = "active_ndef.bin"

        private val SELECT_AID = byteArrayOf(
            0x00, 0xA4.toByte(), 0x04, 0x00, 0x07,
            0xD2.toByte(), 0x76, 0x00, 0x00, 0x85.toByte(), 0x01, 0x01
        )
        private val CC_FILE_ID = byteArrayOf(0xE1.toByte(), 0x03)
        private val NDEF_FILE_ID = byteArrayOf(0xE1.toByte(), 0x04)
        private val STATUS_OK = byteArrayOf(0x90.toByte(), 0x00)
        private val STATUS_NOT_FOUND = byteArrayOf(0x6A, 0x82.toByte())
    }

    private enum class SelectedFile { NONE, CC, NDEF }
    private var selected = SelectedFile.NONE

    private fun readActiveNdef(): ByteArray {
        return try {
            val f = File(filesDir, FILE_NAME)
            if (f.exists()) f.readBytes() else ByteArray(0)
        } catch (e: Exception) {
            ByteArray(0)
        }
    }

    private fun buildCcFile(ndefLength: Int): ByteArray {
        return byteArrayOf(
            0x00, 0x0F,
            0x20,
            0x00, 0x3B,
            0x00, 0x34,
            0x04,
            0x06,
            NDEF_FILE_ID[0], NDEF_FILE_ID[1],
            ((ndefLength shr 8) and 0xFF).toByte(), (ndefLength and 0xFF).toByte(),
            0x00,
            0xFF.toByte()
        )
    }

    private fun matchesPrefix(data: ByteArray, prefix: ByteArray): Boolean {
        if (data.size < prefix.size) return false
        for (i in prefix.indices) if (data[i] != prefix[i]) return false
        return true
    }

    override fun processCommandApdu(commandApdu: ByteArray?, extras: Bundle?): ByteArray {
        val apdu = commandApdu ?: return STATUS_NOT_FOUND

        if (matchesPrefix(apdu, SELECT_AID)) {
            selected = SelectedFile.NONE
            return STATUS_OK
        }

        if (apdu.size >= 7 && apdu[0] == 0x00.toByte() && apdu[1] == 0xA4.toByte() &&
            apdu[2] == 0x00.toByte() && apdu[3] == 0x0C.toByte()
        ) {
            val fileId = byteArrayOf(apdu[5], apdu[6])
            selected = when {
                fileId.contentEquals(CC_FILE_ID) -> SelectedFile.CC
                fileId.contentEquals(NDEF_FILE_ID) -> SelectedFile.NDEF
                else -> SelectedFile.NONE
            }
            return if (selected == SelectedFile.NONE) STATUS_NOT_FOUND else STATUS_OK
        }

        if (apdu.size >= 5 && apdu[0] == 0x00.toByte() && apdu[1] == 0xB0.toByte()) {
            val offset = (((apdu[2].toInt() and 0xFF) shl 8) or (apdu[3].toInt() and 0xFF))
            val length = apdu[4].toInt() and 0xFF

            val ndefBytes = readActiveNdef()

            val fileContent: ByteArray = when (selected) {
                SelectedFile.CC -> buildCcFile(ndefBytes.size)
                SelectedFile.NDEF -> {
                    val nlen = byteArrayOf(
                        ((ndefBytes.size shr 8) and 0xFF).toByte(),
                        (ndefBytes.size and 0xFF).toByte()
                    )
                    nlen + ndefBytes
                }
                SelectedFile.NONE -> ByteArray(0)
            }

            if (fileContent.isEmpty() || offset >= fileContent.size) {
                return STATUS_NOT_FOUND
            }
            val end = minOf(offset + length, fileContent.size)
            val slice = fileContent.copyOfRange(offset, end)
            return slice + STATUS_OK
        }

        return STATUS_NOT_FOUND
    }

    override fun onDeactivated(reason: Int) {
        selected = SelectedFile.NONE
    }
}
`;

const HCE_MODULE_KT = `package ${PACKAGE_NAME}

import android.content.pm.PackageManager
import android.nfc.NfcAdapter
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File

class NfcHceModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "NfcHceModule"

    private fun activeFile(): File = File(reactApplicationContext.filesDir, "active_ndef.bin")

    @ReactMethod
    fun isHceSupported(promise: Promise) {
        try {
            val pm = reactApplicationContext.packageManager
            val hasHce = pm.hasSystemFeature(PackageManager.FEATURE_NFC_HOST_CARD_EMULATION)
            val nfcAvailable = NfcAdapter.getDefaultAdapter(reactApplicationContext) != null
            promise.resolve(hasHce && nfcAvailable)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun setActivePayload(hexString: String, promise: Promise) {
        try {
            activeFile().writeBytes(hexToBytes(hexString))
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("NFC_HCE_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun clearActivePayload(promise: Promise) {
        try {
            val f = activeFile()
            if (f.exists()) f.delete()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("NFC_HCE_ERROR", e.message, e)
        }
    }

    private fun hexToBytes(hex: String): ByteArray {
        val clean = hex.trim()
        val out = ByteArray(clean.length / 2)
        for (i in out.indices) {
            val idx = i * 2
            out[i] = ((Character.digit(clean[idx], 16) shl 4) + Character.digit(clean[idx + 1], 16)).toByte()
        }
        return out
    }
}
`;

const HCE_PACKAGE_KT = `package ${PACKAGE_NAME}

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class NfcHcePackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(NfcHceModule(reactContext))
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}
`;

function withNfcHceManifest(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    const app = manifest.manifest.application[0];

    if (!app.service) app.service = [];
    const exists = app.service.some(
      (s) => s.$ && s.$["android:name"] === ".NfcHceService"
    );
    if (!exists) {
      app.service.push({
        $: {
          "android:name": ".NfcHceService",
          "android:exported": "true",
          "android:permission": "android.permission.BIND_NFC_SERVICE",
        },
        "intent-filter": [
          {
            action: [
              {
                $: {
                  "android:name":
                    "android.nfc.cardemulation.action.HOST_APDU_SERVICE",
                },
              },
            ],
          },
        ],
        "meta-data": [
          {
            $: {
              "android:name": "android.nfc.cardemulation.host_apdu_service",
              "android:resource": "@xml/apduservice",
            },
          },
        ],
      });
    }

    if (!manifest.manifest["uses-feature"]) {
      manifest.manifest["uses-feature"] = [];
    }
    const hasFeature = manifest.manifest["uses-feature"].some(
      (f) => f.$ && f.$["android:name"] === "android.hardware.nfc.hce"
    );
    if (!hasFeature) {
      manifest.manifest["uses-feature"].push({
        $: {
          "android:name": "android.hardware.nfc.hce",
          "android:required": "false",
        },
      });
    }

    return config;
  });
}

function withNfcHceNativeFiles(config) {
  return withDangerousMod(config, [
    "android",
    async (config) => {
      const projectRoot = config.modRequest.platformProjectRoot;
      const javaDir = path.join(
        projectRoot,
        "app/src/main/java",
        ...PACKAGE_NAME.split(".")
      );
      fs.mkdirSync(javaDir, { recursive: true });

      fs.writeFileSync(path.join(javaDir, "NfcHceService.kt"), HCE_SERVICE_KT);
      fs.writeFileSync(path.join(javaDir, "NfcHceModule.kt"), HCE_MODULE_KT);
      fs.writeFileSync(path.join(javaDir, "NfcHcePackage.kt"), HCE_PACKAGE_KT);

      const resXmlDir = path.join(projectRoot, "app/src/main/res/xml");
      fs.mkdirSync(resXmlDir, { recursive: true });
      fs.writeFileSync(
        path.join(resXmlDir, "apduservice.xml"),
        APDU_SERVICE_XML
      );

      const mainAppKtPath = path.join(javaDir, "MainApplication.kt");
      if (fs.existsSync(mainAppKtPath)) {
        let content = fs.readFileSync(mainAppKtPath, "utf8");
        if (!content.includes("NfcHcePackage")) {
          const marker = "return packages";
          if (content.includes(marker)) {
            content = content.replace(
              marker,
              "packages.add(NfcHcePackage())\n            " + marker
            );
            fs.writeFileSync(mainAppKtPath, content);
          } else {
            console.warn(
              "[withNfcHce] MainApplication.kt içinde beklenen 'return packages' satırı bulunamadı; NfcHcePackage otomatik eklenemedi."
            );
          }
        }
      }

      return config;
    },
  ]);
}

module.exports = function withNfcHce(config) {
  config = withNfcHceManifest(config);
  config = withNfcHceNativeFiles(config);
  return config;
};
