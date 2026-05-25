param(
  [ValidateSet("Debug", "Release")]
  [string]$Configuration = "Debug",

  [ValidateSet("aarch64", "armv7", "i686", "x86_64")]
  [string]$Target = "x86_64"
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$tauriDir = Join-Path $root "src-tauri"
$androidDir = Join-Path $tauriDir "gen/android"

$targetMap = @{
  aarch64 = @{
    RustTriple = "aarch64-linux-android"
    Abi = "arm64-v8a"
    Flavor = "Arm64"
  }
  armv7 = @{
    RustTriple = "armv7-linux-androideabi"
    Abi = "armeabi-v7a"
    Flavor = "Arm"
  }
  i686 = @{
    RustTriple = "i686-linux-android"
    Abi = "x86"
    Flavor = "X86"
  }
  x86_64 = @{
    RustTriple = "x86_64-linux-android"
    Abi = "x86_64"
    Flavor = "X86_64"
  }
}

function Invoke-Step {
  param(
    [string]$Label,
    [scriptblock]$Command
  )

  Write-Host "==> $Label"
  & $Command
  $exitCode = if ($LASTEXITCODE -is [int]) { $LASTEXITCODE } else { 0 }
  if ($exitCode -ne 0) {
    throw "$Label failed with exit code $exitCode"
  }
}

$targetInfo = $targetMap[$Target]
$profile = $Configuration.ToLowerInvariant()
$gradleProfile = $Configuration
$buildFlag = if ($Configuration -eq "Debug") { "--debug" } else { "" }
$targetFlag = "--target"
$artifact = Join-Path $tauriDir "target/$($targetInfo.RustTriple)/$profile/libreading_lib.so"
$jniDir = Join-Path $androidDir "app/src/main/jniLibs/$($targetInfo.Abi)"
$jniLib = Join-Path $jniDir "libreading_lib.so"
$gradleTask = ":app:assemble$($targetInfo.Flavor)$gradleProfile"
$rustTask = ":app:rustBuild$($targetInfo.Flavor)$gradleProfile"

if (!(Test-Path $androidDir)) {
  Invoke-Step "Initialize Android project" {
    Push-Location $root
    try {
      pnpm.cmd run android:init
    } finally {
      Pop-Location
    }
  }
}

Write-Host "==> Try official Tauri Android build first"
Push-Location $root
try {
  $tauriArgs = @("tauri", "android", "build", "--ci", "--apk", $targetFlag, $Target)
  if ($buildFlag) {
    $tauriArgs += $buildFlag
  }
  $stdoutFile = New-TemporaryFile
  $stderrFile = New-TemporaryFile
  try {
    $tauriProcess = Start-Process `
      -FilePath "pnpm.cmd" `
      -ArgumentList $tauriArgs `
      -NoNewWindow `
      -Wait `
      -PassThru `
      -RedirectStandardOutput $stdoutFile.FullName `
      -RedirectStandardError $stderrFile.FullName
    $tauriStdout = Get-Content -LiteralPath $stdoutFile.FullName -Raw
    $tauriStderr = Get-Content -LiteralPath $stderrFile.FullName -Raw
    if ($tauriStdout) { Write-Host $tauriStdout -NoNewline }
    if ($tauriStderr) { Write-Host $tauriStderr -NoNewline }
    $tauriExitCode = $tauriProcess.ExitCode
    $tauriText = "$tauriStdout`n$tauriStderr"
  } finally {
    Remove-Item -LiteralPath $stdoutFile.FullName, $stderrFile.FullName -Force -ErrorAction SilentlyContinue
  }
  if ($tauriExitCode -eq 0) {
    Write-Host "Official Tauri Android build completed."
    exit 0
  }
  $isWindowsSymlinkFailure =
    $tauriText.Contains("Failed to create a symbolic link") -and
    $tauriText.Contains("Creation symbolic link is not allowed")

  if (!$isWindowsSymlinkFailure) {
    throw "Official Tauri Android build failed before the known Windows symlink step; refusing to package a fallback APK from a possibly stale native library. Re-run the command above and fix the earlier error first."
  }

  Write-Host "Official Tauri Android build failed with the known Windows symlink error; trying copy fallback."
} finally {
  Pop-Location
}

if (!(Test-Path $artifact)) {
  throw "Expected Rust Android library was not found at $artifact. Re-run with Android SDK/NDK environment variables set."
}

New-Item -ItemType Directory -Path $jniDir -Force | Out-Null
Copy-Item -LiteralPath $artifact -Destination $jniLib -Force
Write-Host "Copied $artifact to $jniLib"

Invoke-Step "Package copied Android library with Gradle" {
  Push-Location $androidDir
  try {
    .\gradlew.bat $gradleTask "-x" $rustTask
  } finally {
    Pop-Location
  }
}

Write-Host "Android $Configuration APK output:"
Get-ChildItem -Path (Join-Path $androidDir "app/build/outputs/apk") -Recurse -Filter "*.apk" |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 5 |
  ForEach-Object { Write-Host " - $($_.FullName)" }
