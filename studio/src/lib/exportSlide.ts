import type { SlideExportPackage } from "@/types";
import { getExportPreset, sanitizeExportFilename } from "@/lib/exportPresets";
import {
  buildSlideBulletText,
  buildSlideCaptionBlock,
} from "@/lib/exportSlideContent";
import { getSlideLayoutRegions } from "@/lib/exportSlideLayout";

export async function exportChartSlide(
  options: SlideExportPackage
): Promise<void> {
  const contentMode = options.contentMode ?? "chart_and_caption";
  const includeCaption = contentMode === "chart_and_caption" && options.caption;
  const preset = getExportPreset(options.presetId);
  const captionBlock = options.caption
    ? buildSlideCaptionBlock(options.caption)
    : null;
  const bulletText = captionBlock ? buildSlideBulletText(captionBlock) : "";
  const layout = getSlideLayoutRegions(contentMode);

  const { default: pptxgen } = await import("pptxgenjs");
  const pptx = new pptxgen();
  pptx.layout = "LAYOUT_16x9";
  pptx.author = "Reports to Charts Studio";
  pptx.subject = options.title;

  const slide = pptx.addSlide();
  slide.background = { color: preset.slide.background };

  slide.addShape(pptx.ShapeType.rect, {
    x: layout.accent.x,
    y: layout.accent.y,
    w: layout.accent.w,
    h: layout.accent.h,
    fill: { color: preset.slide.accentColor },
    line: { color: preset.slide.accentColor },
  });

  slide.addText(options.title, {
    x: layout.title.x,
    y: layout.title.y,
    w: layout.title.w,
    h: layout.title.h,
    fontFace: "Arial",
    fontSize: contentMode === "chart_only" ? 24 : 22,
    bold: true,
    color: preset.slide.titleColor,
    margin: 0,
    shrinkText: true,
  });

  slide.addImage({
    data: options.chartDataUrl,
    x: layout.chart.x,
    y: layout.chart.y,
    w: layout.chart.w,
    h: layout.chart.h,
    sizing: { type: "contain", w: layout.chart.w, h: layout.chart.h },
  });

  if (includeCaption && captionBlock) {
    slide.addText(captionBlock.headline, {
      x: layout.headline.x,
      y: layout.headline.y,
      w: layout.headline.w,
      h: layout.headline.h,
      fontFace: "Arial",
      fontSize: 12,
      bold: true,
      color: preset.slide.titleColor,
      margin: 0,
      shrinkText: true,
    });

    slide.addText(bulletText, {
      x: layout.bullets.x,
      y: layout.bullets.y,
      w: layout.bullets.w,
      h: layout.bullets.h,
      fontFace: "Arial",
      fontSize: 10,
      color: preset.slide.bodyColor,
      valign: "top",
      margin: 0,
      shrinkText: true,
    });
  }

  const sourceText =
    captionBlock?.sourceNote ?? options.sourceNote?.trim() ?? "";
  if (sourceText && layout.source.h > 0) {
    slide.addText(sourceText, {
      x: layout.source.x,
      y: layout.source.y,
      w: layout.source.w,
      h: layout.source.h,
      fontFace: "Arial",
      fontSize: 8,
      italic: true,
      color: preset.slide.sourceColor,
      margin: 0,
      shrinkText: true,
    });
  }

  const filename =
    options.filename ??
    sanitizeExportFilename(options.title, "pptx");

  await pptx.writeFile({ fileName: filename });
}
