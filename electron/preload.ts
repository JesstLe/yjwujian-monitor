import { contextBridge, ipcRenderer } from "electron";

interface SaveFileRequest {
  defaultFileName: string;
  buffer: Uint8Array;
}

interface SaveFileResponse {
  canceled: boolean;
  filePath?: string;
  error?: string;
}

contextBridge.exposeInMainWorld("desktopBridge", {
  saveFile: (request: SaveFileRequest): Promise<SaveFileResponse> =>
    ipcRenderer.invoke("desktop:save-file", request),
});
