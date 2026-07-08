/**
 * Export a chart DOM element as a PNG image.
 * Uses html-to-image for client-side rendering.
 */
export async function exportChartAsPng(
  element: HTMLElement,
  filename: string = "evident-chart.png"
): Promise<void> {
  const { toPng } = await import("html-to-image");

  const dataUrl = await toPng(element, {
    backgroundColor: "#0F172A",
    pixelRatio: 2,
    style: {
      transform: "none",
    },
  });

  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
