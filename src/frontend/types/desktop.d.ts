interface DesktopSaveFileRequest {
  defaultFileName: string;
  buffer: Uint8Array;
}

interface DesktopSaveFileResponse {
  canceled: boolean;
  filePath?: string;
  error?: string;
}

interface DesktopBridge {
  saveFile: (request: DesktopSaveFileRequest) => Promise<DesktopSaveFileResponse>;
}

declare global {
  interface Window {
    desktopBridge?: DesktopBridge;
  }
}

export {};
