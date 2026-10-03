# Rebuilds the Android APK -> MoneyMonitor.apk (uses the SDK + JDK 21 in C:\Users\<you>\android-tools).
# Before building, set your computer's Wi-Fi IP in frontend/src/app/core/build-config.ts (run ipconfig).
$T = "$env:USERPROFILE\android-tools"
$env:JAVA_HOME = (Get-ChildItem "$T\jdk-21*" -Directory | Select-Object -First 1).FullName
$env:ANDROID_HOME = "$T\sdk"
Set-Location "$PSScriptRoot\frontend"
npx ng build; if (-not $?) { exit 1 }
npx cap sync android; if (-not $?) { exit 1 }
Set-Location android
.\gradlew.bat assembleDebug --console=plain; if (-not $?) { exit 1 }
Copy-Item app\build\outputs\apk\debug\app-debug.apk "$PSScriptRoot\MoneyMonitor.apk" -Force
Write-Host "APK ready: $PSScriptRoot\MoneyMonitor.apk"
