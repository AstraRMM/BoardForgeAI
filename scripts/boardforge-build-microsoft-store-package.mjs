#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, readFile, rm, writeFile, copyFile, access } from 'node:fs/promises'
import path from 'node:path'
import JSZip from 'jszip'

const repo = process.cwd()
const packageJson = JSON.parse(await readFile(path.join(repo, 'package.json'), 'utf8'))
const version = packageJson.version || '0.1.0-alpha.1'
const arch = 'x64'
const appType = 'EXE'
const installerFileName = `BoardForgeAI-Setup-${version}-${arch}.exe`
const demoRoot = path.resolve('C:/Users/luifi/Desktop/BoardForge_Public_Alpha_Demo_Package')
const packageRoot = path.join(demoRoot, 'microsoft-store-package')
const workRoot = path.join(repo, 'tmp', 'microsoft-store-package')
const payloadRootName = `BoardForgeAI-${version}`
const payloadZip = path.join(workRoot, 'BoardForgeAI-Payload.zip')
const psBuild = path.join(workRoot, 'Build-BoardForgeAI-Installer.ps1')
const csharpFile = path.join(workRoot, 'BoardForgeAIInstaller.cs')
const installerPath = path.join(packageRoot, installerFileName)
const packageUrl = `https://www.boardforge-ai.com/downloads/${installerFileName}`
const installCommand = `${installerFileName} /S`
const uninstallCommand = `${installerFileName} /S /uninstall`

await rm(workRoot, { recursive: true, force: true })
await mkdir(workRoot, { recursive: true })
await mkdir(packageRoot, { recursive: true })

const trackedFiles = getTrackedFiles()
const payloadFiles = []
for (const rel of trackedFiles) {
  const normalized = rel.replace(/\\/g, '/')
  if (isPayloadFile(normalized)) payloadFiles.push(normalized)
}

const zip = new JSZip()
for (const rel of payloadFiles) {
  const body = await readFile(path.join(repo, rel))
  zip.file(`${payloadRootName}/${rel}`, body)
}
zip.file(`${payloadRootName}/INSTALL_LOCATION.txt`, [
  `BoardForge AI ${version}`,
  '',
  'Default install location:',
  `%LOCALAPPDATA%\\BoardForgeAI\\${version}`,
  '',
  'Start menu shortcuts are created under BoardForge AI.',
  'No supplier keys, token stores, user projects, ESC/FC projects, .env.local, or .boardforge files are bundled.',
  '',
].join('\r\n'))

const zipBytes = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 9 } })
await writeFile(payloadZip, zipBytes)
const payloadBase64 = zipBytes.toString('base64')
await writeFile(csharpFile, renderInstallerSource({ payloadBase64, version, payloadRootName }), 'utf8')
await writeFile(psBuild, renderPowerShellBuild({ csharpFile, installerPath }), 'utf8')

const compile = spawnSync('powershell', ['-ExecutionPolicy', 'Bypass', '-File', psBuild], {
  cwd: repo,
  encoding: 'utf8',
  maxBuffer: 1024 * 1024 * 10,
})
if (compile.status !== 0) {
  process.stderr.write(compile.stdout || '')
  process.stderr.write(compile.stderr || '')
  throw new Error('Failed to compile BoardForge Microsoft Store installer EXE.')
}

const installerBytes = await readFile(installerPath)
const sha256 = createHash('sha256').update(installerBytes).digest('hex')
await writeFile(`${installerPath}.sha256`, `${sha256}  ${installerFileName}\r\n`, 'utf8')

const signStatus = await detectSigningStatus()
const silentInstall = await runInstallerSmokeTest(installerPath, version)

const manifest = {
  status: signStatus.signed ? 'INSTALLER_SIGNED_READY' : 'INSTALLER_READY_UNSIGNED_CERT_REQUIRED',
  product: 'BoardForge AI',
  version,
  architecture: arch,
  appType,
  installerFileName,
  installerPath,
  packageUrl,
  installCommand,
  installerParameters: '/S',
  uninstallCommand,
  language: 'en-us',
  sha256,
  payload: {
    fileCount: payloadFiles.length,
    source: 'tracked allowlisted repository files only',
    excludes: ['.env.local', '.boardforge', 'tokens', 'screenshots', 'ESC/FC projects', 'untracked backlog', 'user projects'],
  },
  signing: signStatus,
  silentInstall,
  compliance: {
    standaloneOfflineInstaller: true,
    downloader: false,
    loginRequiredDuringInstall: false,
    userSuppliesApiKeysAfterInstall: true,
    immutableReleaseFileName: true,
    versionedHttpsUrlPlanned: true,
  },
  generatedAt: new Date().toISOString(),
}

await writeJson(path.join(packageRoot, 'BoardForge_Microsoft_Store_Package_Manifest.json'), manifest)
await writeFile(path.join(packageRoot, 'BoardForge_Microsoft_Store_Package_Manifest.md'), renderManifestMarkdown(manifest), 'utf8')
await writeJson('BoardForge_Microsoft_Store_Package_Info.json', publicPackageInfo(manifest))
await writeFile('BoardForge_Microsoft_Store_Package_Info.md', renderPackageInfoMarkdown(publicPackageInfo(manifest)), 'utf8')
await writeJson('BoardForge_Code_Signing_Readiness_Report.json', signStatus)
await writeFile('BoardForge_Code_Signing_Readiness_Report.md', renderSigningMarkdown(signStatus), 'utf8')
await writeFile(path.join(packageRoot, 'BoardForge_Code_Signing_Readiness_Report.md'), renderSigningMarkdown(signStatus), 'utf8')
await writeFile('BoardForge_Installer_Hosting_Instructions.md', renderHostingMarkdown(manifest), 'utf8')
await writeFile(path.join(packageRoot, 'BoardForge_Installer_Hosting_Instructions.md'), renderHostingMarkdown(manifest), 'utf8')
await writeJson(path.join(packageRoot, 'BoardForge_Silent_Install_Test_Report.json'), silentInstall)
await writeFile(path.join(packageRoot, 'BoardForge_Silent_Install_Test_Report.md'), renderSilentInstallMarkdown(silentInstall), 'utf8')
await writeFile(path.join(packageRoot, 'BoardForge_Microsoft_Store_Package_Notes.md'), renderStoreNotes(manifest), 'utf8')

console.log(JSON.stringify(manifest, null, 2))

function getTrackedFiles() {
  const result = spawnSync('git', ['ls-files'], { cwd: repo, encoding: 'utf8', maxBuffer: 1024 * 1024 * 20 })
  if (result.status !== 0) throw new Error(result.stderr || 'git ls-files failed')
  return result.stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
}

function isPayloadFile(rel) {
  if (/(^|\/)(\.env|\.boardforge|node_modules|dist|tmp|test-results|\.next|out|coverage)(\/|$)/i.test(rel)) return false
  if (/\.(png|jpg|jpeg|webp|gif|mp4|mov|zip|7z|rar|exe|msi|pfx|pem|key|crt|cer)$/i.test(rel)) return false
  if (/secret|token|credential|clipboard|screenshot/i.test(rel)) return false
  if (/BoardForge_ESC_Lessons|FN-ESC|flight-controller|drone-esc/i.test(rel)) return false
  return [
    'package.json',
    'package-lock.json',
    'next.config',
    'tsconfig.json',
    'scripts/',
    'tools/boardforge-launcher/',
    'tools/boardforge-installer/',
    'plugins/boardforge-plugin/bin/',
    'plugins/boardforge-plugin/lib/',
    'plugins/boardforge-plugin/examples/',
    'plugins/boardforge-plugin/package.json',
    'plugins/boardforge-plugin/package-lock.json',
    'apps/web/',
    'src/',
    'public/',
    'README',
    'BoardForge_',
  ].some((prefix) => rel === prefix || rel.startsWith(prefix))
}

function renderInstallerSource({ payloadBase64, version, payloadRootName }) {
  const chunks = payloadBase64.match(/.{1,7600}/g) || []
  return `using System;
using System.IO;
using System.IO.Compression;
using System.Text;

public class BoardForgeInstaller {
  private const string Version = "${escapeCs(version)}";
  private const string PayloadRootName = "${escapeCs(payloadRootName)}";

  public static int Main(string[] args) {
    bool uninstall = HasArg(args, "/uninstall") || HasArg(args, "--uninstall");
    bool silent = HasArg(args, "/S") || HasArg(args, "/Q") || HasArg(args, "--silent") || HasArg(args, "--quiet");
    string installRoot = GetInstallRoot(args);
    try {
      if (uninstall) {
        RemoveInstall(installRoot);
        if (!silent) Console.WriteLine("BoardForge AI removed from " + installRoot);
        return 0;
      }
      Directory.CreateDirectory(installRoot);
      ExtractPayload(installRoot);
      WriteLaunchers(installRoot);
      WriteUninstallMarker(installRoot);
      if (!silent) Console.WriteLine("BoardForge AI installed to " + installRoot);
      return 0;
    } catch (Exception ex) {
      Console.Error.WriteLine("BoardForge AI installer failed: " + ex.Message);
      return 1;
    }
  }

  private static bool HasArg(string[] args, string expected) {
    foreach (string arg in args) if (String.Equals(arg, expected, StringComparison.OrdinalIgnoreCase)) return true;
    return false;
  }

  private static string GetInstallRoot(string[] args) {
    foreach (string arg in args) {
      if (arg.StartsWith("/D=", StringComparison.OrdinalIgnoreCase)) return Path.GetFullPath(arg.Substring(3).Trim('"'));
      if (arg.StartsWith("--dir=", StringComparison.OrdinalIgnoreCase)) return Path.GetFullPath(arg.Substring(6).Trim('"'));
    }
    return Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "BoardForgeAI", Version);
  }

  private static void ExtractPayload(string installRoot) {
    byte[] bytes = Convert.FromBase64String(String.Concat(new string[] {
${chunks.map((chunk) => `      "${chunk}"`).join(',\n')}
    }));
    using (MemoryStream ms = new MemoryStream(bytes))
    using (ZipArchive archive = new ZipArchive(ms, ZipArchiveMode.Read)) {
      foreach (ZipArchiveEntry entry in archive.Entries) {
        string rel = entry.FullName.Replace('/', Path.DirectorySeparatorChar);
        string prefix = PayloadRootName + Path.DirectorySeparatorChar;
        if (rel.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)) rel = rel.Substring(prefix.Length);
        if (String.IsNullOrWhiteSpace(rel)) continue;
        string target = Path.GetFullPath(Path.Combine(installRoot, rel));
        if (!target.StartsWith(Path.GetFullPath(installRoot), StringComparison.OrdinalIgnoreCase)) throw new InvalidOperationException("Unsafe payload path: " + entry.FullName);
        if (entry.FullName.EndsWith("/")) {
          Directory.CreateDirectory(target);
        } else {
          Directory.CreateDirectory(Path.GetDirectoryName(target));
          entry.ExtractToFile(target, true);
        }
      }
    }
  }

  private static void WriteLaunchers(string installRoot) {
    string menu = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.StartMenu), "Programs", "BoardForge AI");
    Directory.CreateDirectory(menu);
    WriteCmd(Path.Combine(menu, "BoardForge AI - Start Local Engine.cmd"), installRoot, "npm run boardforge:start");
    WriteCmd(Path.Combine(menu, "BoardForge AI - Stop Local Engine.cmd"), installRoot, "npm run boardforge:stop");
    WriteCmd(Path.Combine(menu, "BoardForge AI - Doctor.cmd"), installRoot, "npm run boardforge:doctor");
    WriteCmd(Path.Combine(menu, "BoardForge AI - Open Dashboard.cmd"), installRoot, "npm run boardforge:open");
    WriteCmd(Path.Combine(menu, "BoardForge AI - Uninstall.cmd"), Path.GetDirectoryName(System.Reflection.Assembly.GetExecutingAssembly().Location), "\\\"" + System.Reflection.Assembly.GetExecutingAssembly().Location + "\\\" /uninstall");
  }

  private static void WriteCmd(string file, string cwd, string command) {
    File.WriteAllText(file, "@echo off\\r\\ncd /d \\"" + cwd + "\\"\\r\\n" + command + "\\r\\n", Encoding.ASCII);
  }

  private static void WriteUninstallMarker(string installRoot) {
    File.WriteAllText(Path.Combine(installRoot, "BoardForgeAI-Install.json"), "{\\r\\n  \\"product\\": \\"BoardForge AI\\",\\r\\n  \\"version\\": \\"" + Version + "\\",\\r\\n  \\"silentInstall\\": \\"/S\\",\\r\\n  \\"uninstall\\": \\"/S /uninstall\\"\\r\\n}\\r\\n", Encoding.UTF8);
  }

  private static void RemoveInstall(string installRoot) {
    if (Directory.Exists(installRoot)) Directory.Delete(installRoot, true);
    string menu = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.StartMenu), "Programs", "BoardForge AI");
    if (Directory.Exists(menu)) Directory.Delete(menu, true);
  }
}
`
}

function renderPowerShellBuild({ csharpFile, installerPath }) {
  return `$ErrorActionPreference = "Stop"
$src = Get-Content -Raw -LiteralPath "${escapePs(csharpFile)}"
$out = "${escapePs(installerPath)}"
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $out) | Out-Null
Remove-Item -LiteralPath $out -ErrorAction SilentlyContinue
Add-Type -TypeDefinition $src -OutputAssembly $out -OutputType ConsoleApplication -ReferencedAssemblies @("System.IO.Compression","System.IO.Compression.FileSystem","System.Core")
if (!(Test-Path -LiteralPath $out)) { throw "Installer EXE was not created." }
`
}

async function detectSigningStatus() {
  const ps = 'Get-ChildItem Cert:\\CurrentUser\\My -CodeSigningCert -ErrorAction SilentlyContinue | Select-Object -First 1 | ConvertTo-Json -Compress'
  const result = spawnSync('powershell', ['-NoProfile', '-Command', ps], { encoding: 'utf8' })
  const hasCert = Boolean((result.stdout || '').trim())
  return {
    status: hasCert ? 'SIGNING_CERT_DETECTED_SIGNING_NOT_AUTOMATED' : 'SIGNING_BLOCKED_CERT_REQUIRED',
    signed: false,
    certificateDetected: hasCert,
    signtoolDetected: await commandExists('signtool'),
    nextStep: hasCert
      ? 'Install Windows SDK signtool or configure Microsoft Trusted Signing, then rerun release signing.'
      : 'Obtain a CA-trusted Authenticode code-signing certificate or configure Microsoft Trusted Signing / Azure Trusted Signing, then sign the installer and rerun package validation.',
  }
}

async function commandExists(name) {
  const result = spawnSync('powershell', ['-NoProfile', '-Command', `if (Get-Command ${name} -ErrorAction SilentlyContinue) { "yes" }`], { encoding: 'utf8' })
  return /yes/.test(result.stdout || '')
}

async function exists(file) {
  try {
    await access(file)
    return true
  } catch {
    return false
  }
}

async function runInstallerSmokeTest(exe, version) {
  const installDir = path.join(workRoot, 'silent-install-target')
  await rm(installDir, { recursive: true, force: true })
  const install = spawnSync(exe, ['/S', `/D=${installDir}`], { cwd: workRoot, encoding: 'utf8', timeout: 120000 })
  const markerPath = path.join(installDir, 'BoardForgeAI-Install.json')
  const markerExists = await exists(markerPath)
  const uninstall = spawnSync(exe, ['/S', '/uninstall', `/D=${installDir}`], { cwd: workRoot, encoding: 'utf8', timeout: 120000 })
  const removed = !(await exists(installDir))
  return {
    status: install.status === 0 && markerExists && uninstall.status === 0 && removed ? 'SILENT_INSTALL_AND_UNINSTALL_PASSED' : 'SILENT_INSTALL_REVIEW_REQUIRED',
    version,
    installCommand,
    uninstallCommand,
    installExitCode: install.status,
    uninstallExitCode: uninstall.status,
    markerExists,
    removed,
    installDir,
    installStdout: scrub(install.stdout),
    installStderr: scrub(install.stderr),
    uninstallStdout: scrub(uninstall.stdout),
    uninstallStderr: scrub(uninstall.stderr),
  }
}

function publicPackageInfo(manifest) {
  return {
    packageUrl: manifest.packageUrl,
    packageType: manifest.appType,
    architecture: manifest.architecture,
    language: manifest.language,
    version: manifest.version,
    sha256: manifest.sha256,
    installerParameters: manifest.installerParameters,
    silentInstallCommand: manifest.installCommand,
    silentUninstallCommand: manifest.uninstallCommand,
    signingStatus: manifest.signing.status,
    launchGateStatus: manifest.status,
  }
}

async function writeJson(file, value) {
  await writeFile(file, JSON.stringify(value, null, 2), 'utf8')
}

function renderManifestMarkdown(manifest) {
  return [
    '# BoardForge Microsoft Store Package Manifest',
    '',
    `- Status: ${manifest.status}`,
    `- Installer: ${manifest.installerPath}`,
    `- Version: ${manifest.version}`,
    `- Architecture: ${manifest.architecture}`,
    `- App type: ${manifest.appType}`,
    `- SHA256: ${manifest.sha256}`,
    `- Silent install: ${manifest.installCommand}`,
    `- Silent uninstall: ${manifest.uninstallCommand}`,
    `- Package URL: ${manifest.packageUrl}`,
    `- Signing: ${manifest.signing.status}`,
    `- Silent test: ${manifest.silentInstall.status}`,
    '',
    '## Payload Policy',
    '- Built from tracked, allowlisted source files only.',
    '- No supplier keys, token stores, .env.local, .boardforge, screenshots, user projects, ESC, or FC project files are bundled.',
    '- Installer is standalone and offline; it does not download an installer payload.',
    '',
  ].join('\n')
}

function renderPackageInfoMarkdown(info) {
  return [
    '# BoardForge Microsoft Store Package Info',
    '',
    `- Package URL: ${info.packageUrl}`,
    `- Package type: ${info.packageType}`,
    `- Architecture: ${info.architecture}`,
    `- Language: ${info.language}`,
    `- Version: ${info.version}`,
    `- SHA256: ${info.sha256}`,
    `- Installer parameters: ${info.installerParameters}`,
    `- Silent install command: ${info.silentInstallCommand}`,
    `- Silent uninstall command: ${info.silentUninstallCommand}`,
    `- Signing status: ${info.signingStatus}`,
    `- Launch gate status: ${info.launchGateStatus}`,
    '',
    'Partner Center values:',
    '- Package URL: https://www.boardforge-ai.com/downloads/BoardForgeAI-Setup-0.1.0-alpha.1-x64.exe',
    '- Architecture: x64',
    '- App type: EXE',
    '- Installer parameters: /S',
    '',
  ].join('\n')
}

function renderSigningMarkdown(signing) {
  return [
    '# BoardForge Code Signing Readiness Report',
    '',
    `- Status: ${signing.status}`,
    `- Signed: ${signing.signed}`,
    `- Code-signing certificate detected: ${signing.certificateDetected}`,
    `- SignTool detected: ${signing.signtoolDetected}`,
    '',
    '## Next Step',
    signing.nextStep,
    '',
    'No signed-installer claim is made until Authenticode signing is verified.',
    '',
  ].join('\n')
}

function renderHostingMarkdown(manifest) {
  return [
    '# BoardForge Installer Hosting Instructions',
    '',
    `Upload this exact immutable installer file: ${manifest.installerFileName}`,
    '',
    `Target HTTPS URL: ${manifest.packageUrl}`,
    '',
    'Rules:',
    '- Do not replace the binary at the same URL after Microsoft submission.',
    '- For an update, publish a new versioned URL and submit that package in Partner Center.',
    '- Host the `.sha256` checksum beside the installer for verification.',
    '- Keep install silent parameter `/S` in Partner Center.',
    '',
  ].join('\n')
}

function renderSilentInstallMarkdown(report) {
  return [
    '# BoardForge Silent Install Test Report',
    '',
    `- Status: ${report.status}`,
    `- Install command: ${report.installCommand}`,
    `- Uninstall command: ${report.uninstallCommand}`,
    `- Install exit code: ${report.installExitCode}`,
    `- Uninstall exit code: ${report.uninstallExitCode}`,
    `- Marker written: ${report.markerExists}`,
    `- Install directory removed: ${report.removed}`,
    '',
  ].join('\n')
}

function renderStoreNotes(manifest) {
  return [
    '# Microsoft Store Package Notes',
    '',
    'BoardForge AI installs the local-first BoardForge engine/launcher payload. The installer does not require login during install. Users provide supplier/API credentials after install through local configuration or the paired BoardForge site.',
    '',
    `- Package URL: ${manifest.packageUrl}`,
    `- Architecture: ${manifest.architecture}`,
    `- App type: ${manifest.appType}`,
    `- Installer parameters: ${manifest.installerParameters}`,
    `- Silent uninstall: ${manifest.uninstallCommand}`,
    `- Signing status: ${manifest.signing.status}`,
    '',
    'Limitations:',
    '- Installer is unsigned until a trusted Authenticode certificate or Microsoft Trusted Signing is configured.',
    '- PoE compliance and safety review remain external human-review items.',
    '- BoardForge does not guarantee manufacturability without review of generated ERC/DRC/export evidence.',
    '',
  ].join('\n')
}

function escapeCs(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

function escapePs(value) {
  return String(value).replace(/`/g, '``').replace(/"/g, '`"')
}

function scrub(value = '') {
  return String(value).replace(/sk-[A-Za-z0-9_-]+|sk-or-v1-[A-Za-z0-9_-]+|AQ\.[A-Za-z0-9_-]+/g, '[REDACTED]')
}
