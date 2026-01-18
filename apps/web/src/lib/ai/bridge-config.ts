/**
 * Bridge server configuration and platform detection utilities.
 */

export type Platform = 'macos-arm64' | 'macos-x64' | 'windows-x64' | 'linux-x64' | 'unknown';

export const DEFAULT_BRIDGE_URL = 'http://localhost:3847';
export const GITHUB_REPO = 'teddyjfpender/glow';
export const BRIDGE_RELEASE_TAG = 'bridge-latest';

/**
 * Detect the user's platform for downloading the correct binary.
 */
export function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') {
    return 'unknown';
  }

  const userAgent = navigator.userAgent.toLowerCase();
  const platform = navigator.platform?.toLowerCase() ?? '';

  // Check for Windows
  if (userAgent.includes('win') || platform.includes('win')) {
    return 'windows-x64';
  }

  // Check for macOS
  if (userAgent.includes('mac') || platform.includes('mac')) {
    // Try to detect Apple Silicon vs Intel
    // navigator.userAgentData is available in some browsers
    const uaData = (navigator as Navigator & { userAgentData?: { platform: string } })
      .userAgentData;
    if (uaData?.platform === 'macOS') {
      // Modern browsers on Apple Silicon report ARM architecture
      // But this isn't reliable, so default to arm64 for modern Macs
      return 'macos-arm64';
    }
    // Fallback: assume arm64 for newer systems (M1+ is dominant now)
    return 'macos-arm64';
  }

  // Check for Linux
  if (userAgent.includes('linux') || platform.includes('linux')) {
    return 'linux-x64';
  }

  return 'unknown';
}

/**
 * Get the display name for a platform.
 */
export function getPlatformDisplayName(platform: Platform): string {
  switch (platform) {
    case 'macos-arm64':
      return 'macOS (Apple Silicon)';
    case 'macos-x64':
      return 'macOS (Intel)';
    case 'windows-x64':
      return 'Windows (x64)';
    case 'linux-x64':
      return 'Linux (x64)';
    case 'unknown':
      return 'Unknown Platform';
  }
}

/**
 * Get the download URL for a specific platform.
 * Uses the "bridge-latest" release which is auto-updated on every push to master.
 */
export function getDownloadUrl(platform: Platform): string | null {
  if (platform === 'unknown') {
    return null;
  }

  const filename =
    platform === 'windows-x64' ? `glow-bridge-${platform}.exe` : `glow-bridge-${platform}`;

  return `https://github.com/${GITHUB_REPO}/releases/download/${BRIDGE_RELEASE_TAG}/${filename}`;
}

/**
 * Get the filename for a specific platform.
 */
export function getDownloadFilename(platform: Platform): string {
  if (platform === 'windows-x64') {
    return 'glow-bridge-windows-x64.exe';
  }
  return `glow-bridge-${platform}`;
}

/**
 * Get installation commands for a specific platform.
 */
export function getInstallCommands(platform: Platform): { download: string[]; run: string[] } {
  const filename = getDownloadFilename(platform);
  const downloadUrl = getDownloadUrl(platform);

  if (platform === 'windows-x64') {
    return {
      download: [
        `# Download from GitHub Releases`,
        `# Or use PowerShell:`,
        `Invoke-WebRequest -Uri "${downloadUrl}" -OutFile "${filename}"`,
      ],
      run: [`.\\${filename} serve`],
    };
  }

  // Unix-like systems (macOS, Linux)
  return {
    download: [
      `# Download the binary`,
      `curl -L "${downloadUrl}" -o glow-bridge`,
      ``,
      `# Make it executable`,
      `chmod +x glow-bridge`,
    ],
    run: [`./glow-bridge serve`],
  };
}

/**
 * Get build-from-source commands.
 */
export function getBuildFromSourceCommands(): string[] {
  return [
    `# Clone the repository`,
    `git clone https://github.com/${GITHUB_REPO}.git`,
    `cd glow`,
    ``,
    `# Build the bridge server`,
    `cargo build -p glow-bridge --release`,
    ``,
    `# Run the server`,
    `./target/release/glow-bridge serve`,
  ];
}

/**
 * All available platforms for the dropdown.
 */
export const ALL_PLATFORMS: Platform[] = ['macos-arm64', 'macos-x64', 'windows-x64', 'linux-x64'];
