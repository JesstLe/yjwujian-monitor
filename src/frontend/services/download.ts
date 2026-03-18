function browserDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.style.display = "none";
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();

  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);
}

export async function downloadBlob(blob: Blob, fileName: string): Promise<void> {
  if (!window.desktopBridge?.saveFile) {
    browserDownload(blob, fileName);
    return;
  }

  const buffer = new Uint8Array(await blob.arrayBuffer());
  const result = await window.desktopBridge.saveFile({
    defaultFileName: fileName,
    buffer,
  });

  if (result.error) {
    throw new Error(result.error);
  }

  if (result.canceled) {
    return;
  }
}
