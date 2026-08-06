# Servidor estático sem Node.js (só PowerShell / .NET)
# Uso: powershell -ExecutionPolicy Bypass -File scripts/serve-dist.ps1

param(
  [int]$Port = 8080,
  [string]$Root = ""
)

$ErrorActionPreference = "Stop"

if (-not $Root) {
  $Root = Join-Path (Split-Path $PSScriptRoot -Parent) "dist"
}

$Root = (Resolve-Path $Root).Path
if (-not (Test-Path (Join-Path $Root "index.html"))) {
  Write-Error "Pasta dist nao encontrada em $Root. Rode o build antes (ou peca para gerar a pasta dist)."
}

$listener = New-Object System.Net.HttpListener
$prefix = "http://127.0.0.1:$Port/"
$listener.Prefixes.Add($prefix)

try {
  $listener.Start()
} catch {
  Write-Host ""
  Write-Host "Nao foi possivel abrir a porta $Port."
  Write-Host "Tente outra: powershell -ExecutionPolicy Bypass -File scripts/serve-dist.ps1 -Port 5500"
  Write-Host "Erro: $($_.Exception.Message)"
  exit 1
}

$mime = @{
  ".html" = "text/html; charset=utf-8"
  ".js"   = "application/javascript; charset=utf-8"
  ".css"  = "text/css; charset=utf-8"
  ".svg"  = "image/svg+xml"
  ".png"  = "image/png"
  ".jpg"  = "image/jpeg"
  ".jpeg" = "image/jpeg"
  ".ico"  = "image/x-icon"
  ".json" = "application/json"
  ".woff" = "font/woff"
  ".woff2"= "font/woff2"
  ".map"  = "application/json"
}

Write-Host ""
Write-Host "SEMCAS - preview sem Node.js"
Write-Host "Abra no navegador: $prefix"
Write-Host "Pasta: $Root"
Write-Host "Ctrl+C para parar"
Write-Host ""

# Abre o navegador automaticamente
Start-Process $prefix

while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  $req = $ctx.Request
  $res = $ctx.Response

  try {
    $path = [Uri]::UnescapeDataString($req.Url.AbsolutePath.TrimStart("/"))
    if ([string]::IsNullOrWhiteSpace($path)) { $path = "index.html" }

    $full = [System.IO.Path]::GetFullPath((Join-Path $Root ($path -replace "/", "\")))

    # Evita sair da pasta dist
    if (-not $full.StartsWith($Root, [System.StringComparison]::OrdinalIgnoreCase)) {
      $res.StatusCode = 403
      $res.Close()
      continue
    }

    # SPA fallback: rotas sem arquivo -> index.html
    if (-not (Test-Path $full -PathType Leaf)) {
      $full = Join-Path $Root "index.html"
    }

    $ext = [System.IO.Path]::GetExtension($full).ToLowerInvariant()
    $bytes = [System.IO.File]::ReadAllBytes($full)
    $res.ContentType = $(if ($mime.ContainsKey($ext)) { $mime[$ext] } else { "application/octet-stream" })
    $res.ContentLength64 = $bytes.Length
    $res.StatusCode = 200
    $res.OutputStream.Write($bytes, 0, $bytes.Length)
  } catch {
    $res.StatusCode = 500
  } finally {
    $res.Close()
  }
}
