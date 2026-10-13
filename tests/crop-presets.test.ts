import { describe, expect, it } from "vitest";
import {
  CROP_PRESETS,
  calculateCropDimensions,
  normaliseCropArea,
  type CropPresetKey,
} from "@/lib/crop";

describe("Crop Presets & Multi-Aspect Pipeline", () => {
  it("defines standard aspect ratio presets", () => {
    const expectedKeys: CropPresetKey[] = ["16:10", "16:9", "4:3", "1:1", "1.91:1"];
    for (const key of expectedKeys) {
      expect(CROP_PRESETS[key]).toBeDefined();
      expect(CROP_PRESETS[key].aspect).toBeGreaterThan(0);
      expect(CROP_PRESETS[key].maxWidth).toBeGreaterThanOrEqual(1000);
    }
  });

  it("calculates destination canvas dimensions matching preset aspect ratios", () => {
    const safeArea = { x: 0, y: 0, width: 1600, height: 1000 };

    // 16:9
    const heroCrop = calculateCropDimensions(safeArea, CROP_PRESETS["16:9"]);
    expect(heroCrop.width).toBe(1200);
    expect(heroCrop.height).toBe(Math.round(1200 / (16 / 9))); // 675

    // 1:1
    const squareCrop = calculateCropDimensions(safeArea, CROP_PRESETS["1:1"]);
    expect(squareCrop.width).toBe(1000);
    expect(squareCrop.height).toBe(1000);

    // 16:10
    const thumbCrop = calculateCropDimensions(safeArea, CROP_PRESETS["16:10"]);
    expect(thumbCrop.width).toBe(1200);
    expect(thumbCrop.height).toBe(Math.round(1200 / (16 / 10))); // 750

    // 4:3
    const editCrop = calculateCropDimensions(safeArea, CROP_PRESETS["4:3"]);
    expect(editCrop.width).toBe(1200);
    expect(editCrop.height).toBe(Math.round(1200 / (4 / 3))); // 900
  });

  it("clamps small images without exceeding source bounds", () => {
    const smallArea = { x: 10, y: 10, width: 600, height: 400 };
    const crop = calculateCropDimensions(smallArea, CROP_PRESETS["16:9"]);
    expect(crop.width).toBe(600);
    expect(crop.height).toBe(Math.round(600 / (16 / 9))); // 338
  });
});
