# Copy script for creating a standalone mc4db from marvelsdb_merlin
# Usage: run from PowerShell (may require elevated rights for some file operations)

$srcRoot = 'c:\github\marvelsdb_merlin'
$dstRoot = 'c:\github\mc4db'

Write-Host "Source: $srcRoot"
Write-Host "Destination: $dstRoot"

# Ensure destination exists
if (-not (Test-Path -Path $dstRoot)) {
    New-Item -ItemType Directory -Path $dstRoot | Out-Null
}

# List of paths to copy (relative to source)
$itemsToCopy = @(
    'backend',
    'web\react',
    'web\bundles',
    'web\css',
    '.env.example',
    'backend\package.json',
    'README.md'
)

foreach ($rel in $itemsToCopy) {
    $src = Join-Path $srcRoot $rel
    $dst = Join-Path $dstRoot (Split-Path $rel -Leaf)

    if (Test-Path $src) {
        Write-Host "Copying $src -> $dst"
        # If source is a file
        if (Test-Path $src -PathType Leaf) {
            Copy-Item -Path $src -Destination (Join-Path $dstRoot (Split-Path $rel -Leaf)) -Force
        } else {
            # It's a directory
            Copy-Item -Path $src -Destination $dst -Recurse -Force -ErrorAction SilentlyContinue
        }
    } else {
        Write-Host "Skipping missing path: $src"
    }
}

# Initialize git repo if not present
Set-Location $dstRoot
if (-not (Test-Path -Path (Join-Path $dstRoot '.git'))) {
    if (Get-Command git -ErrorAction SilentlyContinue) {
        Write-Host "Initializing git repo in $dstRoot"
        git init | Out-Null
        git add .
        git commit -m 'Initial import: mc4db copy from marvelsdb_merlin' | Out-Null
        Write-Host "Git repo initialized and first commit created."
    } else {
        Write-Host "Git not found on PATH. Skipping git init."
    }
} else {
    Write-Host ".git already present - skipping git init."
}

Write-Host "Copy complete. Next: run 'npm install' inside $dstRoot and adjust .env settings."
