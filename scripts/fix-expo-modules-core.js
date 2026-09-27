// Postinstall fix for expo-modules-core + React Native 0.81 Android builds.
// RN 0.81 converted com.facebook.react.bridge.Promise to Kotlin with a
// non-null `code: String` parameter. expo-modules-core (<=57.0.19, and 58.x)
// still declares/overrides it as nullable `String?`, which fails Kotlin
// compilation (:expo-modules-core:compileDebugKotlin).
// This patch makes the bridge call sites null-safe. Idempotent.
const fs = require('fs');
const path = require('path');

const coreDir = path.join(
  __dirname, '..', 'node_modules', 'expo', 'node_modules', 'expo-modules-core',
  'android', 'src', 'main', 'java', 'expo', 'modules', 'kotlin'
);

function patchFile(file, replacements) {
  const filePath = path.join(coreDir, file);
  if (!fs.existsSync(filePath)) {
    console.log(`[postinstall] skip: ${file} not found`);
    return;
  }
  let src = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  for (const [from, to] of replacements) {
    if (src.includes(from)) {
      src = src.split(from).join(to);
      changed = true;
    }
  }
  if (changed) {
    fs.writeFileSync(filePath, src);
    console.log(`[postinstall] patched ${file}`);
  } else {
    console.log(`[postinstall] ${file} already patched`);
  }
}

patchFile('KPromiseWrapper.kt', [
  [
    'bridgePromise.reject(code, message, cause)',
    'bridgePromise.reject(code ?: "UnknownCode", message, cause)',
  ],
]);

patchFile('Promise.kt', [
  [
    'override fun reject(code: String?,',
    'override fun reject(code: String,',
  ],
  // RN 0.81's 4-arg reject(code, message, throwable, userInfo) is the one
  // overload that keeps nullable code -- revert the blanket change for it.
  [
    'override fun reject(code: String, message: String?, throwable: Throwable?, userInfo: WritableMap?) {',
    'override fun reject(code: String?, message: String?, throwable: Throwable?, userInfo: WritableMap?) {',
  ],
]);
