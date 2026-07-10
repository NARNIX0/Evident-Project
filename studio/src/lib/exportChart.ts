/**
 * Capture a chart DOM element as a PNG data URL.
 */
export async function elementToPngDataUrl(
  element: HTMLElement,
  backgroundColor: string
): Promise<string> {
  const { toPng } = await import("html-to-image");

  return toPng(element, {
    backgroundColor,
    pixelRatio: 2,
    style: {
      transform: "none",
    },
  });
}

/**
 * Export a chart DOM element as a PNG download.
 */
export async function exportChartAsPng(
  element: HTMLElement,
  filename: string = "evident-chart.png",
  backgroundColor: string = "#ffffff"
): Promise<void> {
  const dataUrl = await elementToPngDataUrl(element, backgroundColor);

  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
