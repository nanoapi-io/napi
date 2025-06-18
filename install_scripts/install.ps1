# PowerShell script to install NanoAPI CLI on Windows

$ErrorActionPreference = "Stop"

# Define platform-specific filename
$FILENAME = "napi.exe"
$RELEASE_URL = "https://github.com/nanoapi-io/napi/releases/latest/download/"
$DOWNLOAD_URL = "$RELEASE_URL$FILENAME"

# Define install path (add this path to your system PATH if needed)
$INSTALL_DIR = "$env:ProgramFiles\NanoAPI"
$INSTALL_PATH = Join-Path $INSTALL_DIR "napi.exe"
$BACKUP_PATH = "$INSTALL_PATH.bak"

# Create install directory if it doesn't exist
if (-Not (Test-Path $INSTALL_DIR)) {
    New-Item -ItemType Directory -Path $INSTALL_DIR | Out-Null
}

# Backup existing binary
if (Test-Path $INSTALL_PATH) {
    Write-Output "Existing version found, creating a backup..."
    Move-Item -Force -Path $INSTALL_PATH -Destination $BACKUP_PATH
} else {
    Write-Output "No existing version found, proceeding with installation."
}

# Download the binary
$TEMP_PATH = Join-Path $env:TEMP $FILENAME
Write-Output "Downloading the latest version of $FILENAME..."
Invoke-WebRequest -Uri $DOWNLOAD_URL -OutFile $TEMP_PATH

# Install the binary
Write-Output "Installing new version..."
try {
    Move-Item -Force -Path $TEMP_PATH -Destination $INSTALL_PATH
    Write-Output "Installation/Update successful! You can now use your CLI by typing 'napi' if it's in your PATH."
} catch {
    Write-Error "Update failed! Restoring the old version..."
    if (Test-Path $BACKUP_PATH) {
        Move-Item -Force -Path $BACKUP_PATH -Destination $INSTALL_PATH
        Write-Output "Restored the old version. Please try again later."
    } else {
        Write-Error "Backup not found. Manual intervention required."
    }
}
