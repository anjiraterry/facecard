/**
 * Exports a portrait or card image using the native mobile Share Sheet ("Save Image")
 * when supported via Web Share API Level 2, falling back to an explicit browser download.
 */
export async function exportImageForPhotos(params: {
  dataUrl: string;
  filename: string;
  title?: string;
}): Promise<{ method: 'WEB_SHARE' | 'DOWNLOAD'; message: string }> {
  const { dataUrl, filename, title = 'Face Card Portrait' } = params;
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const mime = blob.type || 'image/jpeg';
  const file = new File([blob], filename, { type: mime });

  if (
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files: [file] })
  ) {
    await navigator.share({
      title,
      files: [file],
    });
    return {
      method: 'WEB_SHARE',
      message: 'Share sheet opened — choose "Save Image" to add to Photos.',
    };
  }

  // Explicit download fallback (never claim automatic Photos library write on unsupported browsers)
  const objectUrl = URL.createObjectURL(blob);
  try {
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }

  return {
    method: 'DOWNLOAD',
    message: 'Image downloaded to your device Downloads folder.',
  };
}
