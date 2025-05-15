#!/bin/bash

# Determine platform and release URL for GitHub
OS=$(uname -s)
RELEASE_URL="https://github.com/nanoapi-io/napi/releases/latest/download/"

# Define the appropriate binary based on the OS
if [ "$OS" == "Darwin" ]; then
    FILENAME="napi.macos"
elif [ "$OS" == "Linux" ]; then
    FILENAME="napi.linux"
else
    echo "Unsupported OS: $OS"
    exit 1
fi

# Set the installation path
INSTALL_PATH="/usr/local/bin/napi"
BACKUP_PATH="$INSTALL_PATH.bak"

# Check if the executable already exists
if [ -f "$INSTALL_PATH" ]; then
    echo "Existing version found, creating a backup..."
    sudo mv "$INSTALL_PATH" "$BACKUP_PATH"
else
    echo "No existing version found, proceeding with installation."
fi

# Download the binary
echo "Downloading the latest version of $FILENAME..."
curl -L "$RELEASE_URL$FILENAME" -o "$FILENAME"

# Make it executable
chmod +x "$FILENAME"

# Attempt to install the new version
echo "Installing new version..."
sudo mv "$FILENAME" "$INSTALL_PATH"

# Check if the installation was successful
if [ $? -eq 0 ]; then
    echo "Installation/Update successful! You can now use your CLI by typing 'napi' in the terminal."
else
    # If the installation failed, restore the backup
    echo "Update failed! Restoring the old version..."
    sudo mv "$BACKUP_PATH" "$INSTALL_PATH"
    echo "Restored the old version. Please try again later."
fi
