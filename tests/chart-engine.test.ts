import { describe, expect, it } from "vitest";
import {
  parseChartNumeric,
  calculateSeriesStats,
  alignDatasetObservations,
  formatChartValue,
  generateAccessibleTableHtml,
  isChronologicalSeries,
} from "@/lib/chart-format";

describe("Chart Engine & Calculation Pipeline", () => {
  describe("parseChartNumeric", () => {
    it("handles clean finite numbers", () => {
      expect(parseChartNumeric(42)).toBe(42);
      expect(parseChartNumeric(0)).toBe(0);
      expect(parseChartNumeric(-15.5)).toBe(-15.5);
    });

    it("parses currency, commas, and percentage strings", () => {
      expect(parseChartNumeric("$1,250.75")).toBe(1250.75);
      expect(parseChartNumeric("€99.90")).toBe(99.9);
      expect(parseChartNumeric("85%")).toBe(85);
      expect(parseChartNumeric("4,500 mAh")).toBe(4500);
      expect(parseChartNumeric("120 W")).toBe(120);
    });

    it("parses accounting negative parentheses", () => {
      expect(parseChartNumeric("(250.00)")).toBe(-250);
      expect(parseChartNumeric("($1,500.50)")).toBe(-1500.5);
    });

    it("returns null for non-numeric or missing data without silent zero conversion", () => {
      expect(parseChartNumeric(null)).toBeNull();
      expect(parseChartNumeric(undefined)).toBeNull();
      expect(parseChartNumeric("")).toBeNull();
      expect(parseChartNumeric("-")).toBeNull();
      expect(parseChartNumeric("—")).toBeNull();
      expect(parseChartNumeric("N/A")).toBeNull();
      expect(parseChartNumeric("Not Available")).toBeNull();
      expect(parseChartNumeric(NaN)).toBeNull();
    });
  });

  describe("calculateSeriesStats", () => {
    it("calculates min, max, mean, median, sum and change percentage correctly", () => {
      const data = [100, 200, 300, 400, 500];
      const stats = calculateSeriesStats(data);

      expect(stats.count).toBe(5);
      expect(stats.min).toBe(100);
      expect(stats.max).toBe(500);
      expect(stats.mean).toBe(300);
      expect(stats.median).toBe(300);
      expect(stats.sum).toBe(1500);
      // (500 - 100) / 100 * 100 = 400%
      expect(stats.change).toBe(400);
    });

    it("calculates even-length median and negative change", () => {
      const data = [100, 80, 60, 40];
      const stats = calculateSeriesStats(data);

      expect(stats.count).toBe(4);
      expect(stats.min).toBe(40);
      expect(stats.max).toBe(100);
      expect(stats.mean).toBe(70);
      expect(stats.median).toBe(70); // (60 + 80) / 2
      expect(stats.change).toBe(-60); // (40 - 100) / 100 * 100 = -60%
    });

    it("filters out nulls and NaNs gracefully", () => {
      const data = [10, null, 20, undefined, "N/A", 30] as any[];
      const stats = calculateSeriesStats(data);

      expect(stats.count).toBe(3);
      expect(stats.min).toBe(10);
      expect(stats.max).toBe(30);
      expect(stats.mean).toBe(20);
      expect(stats.median).toBe(20);
      expect(stats.sum).toBe(60);
    });

    it("returns null properties for empty series", () => {
      const stats = calculateSeriesStats([]);
      expect(stats.count).toBe(0);
      expect(stats.min).toBeNull();
      expect(stats.max).toBeNull();
      expect(stats.mean).toBeNull();
      expect(stats.median).toBeNull();
      expect(stats.sum).toBeNull();
      expect(stats.change).toBeNull();
    });
  });

  describe("alignDatasetObservations", () => {
    it("aligns keys across heterogeneous records", () => {
      const records = [
        { name: "Device A", battery: 5000, price: "$999" },
        { name: "Device B", battery: "4500", charging: "65W" },
      ];
      const aligned = alignDatasetObservations(records, ["battery", "price", "charging"]);

      expect(aligned).toHaveLength(2);
      expect(aligned[0]).toEqual({
        name: "Device A",
        battery: 5000,
        price: 999,
        charging: null,
      });
      expect(aligned[1]).toEqual({
        name: "Device B",
        battery: 4500,
        price: null,
        charging: 65,
      });
    });
  });

  describe("formatChartValue", () => {
    it("applies specialized formatting based on key name", () => {
      expect(formatChartValue(999, "price")).toBe("$999");
      expect(formatChartValue(5000, "batteryCapacity")).toBe("5,000 mAh");
      expect(formatChartValue(120, "chargingSpeed")).toBe("120 W");
      expect(formatChartValue(2500, "geekbenchScore")).toBe("2,500 pts");
      expect(formatChartValue(15, "throttlingRate")).toBe("15%");
    });

    it("respects custom prefix and suffix overrides", () => {
      expect(formatChartValue(45, "custom", "approx. ", " ms")).toBe("approx. 45 ms");
    });

    it("handles null/undefined gracefully", () => {
      expect(formatChartValue(null, "score")).toBe("N/A");
      expect(formatChartValue(undefined, "price")).toBe("N/A");
    });
  });

  describe("generateAccessibleTableHtml", () => {
    it("generates semantic table with caption and headers", () => {
      const data = [
        { name: "iPhone 16", battery: 3561, price: 799 },
        { name: "Galaxy S24", battery: 4000, price: 799 },
      ];
      const html = generateAccessibleTableHtml(data, ["battery", "price"], "Smartphone Comparison");

      expect(html).toContain("<caption>Smartphone Comparison</caption>");
      expect(html).toContain('<th scope="col">Observation</th>');
      expect(html).toContain('<th scope="col">battery</th>');
      expect(html).toContain('<th scope="col">price</th>');
      expect(html).toContain('<th scope="row">iPhone 16</th>');
      expect(html).toContain("<td>3,561 mAh</td>");
      expect(html).toContain("<td>$799</td>");
    });
  });

  describe("isChronologicalSeries", () => {
    it("detects years as chronological timeline", () => {
      expect(isChronologicalSeries(["2020", "2021", "2022", "2023", "2024"])).toBe(true);
      expect(isChronologicalSeries([2019, 2020, 2021])).toBe(true);
    });

    it("detects months and quarters as chronological timeline", () => {
      expect(isChronologicalSeries(["Jan", "Feb", "Mar", "Apr", "May"])).toBe(true);
      expect(isChronologicalSeries(["Q1", "Q2", "Q3", "Q4"])).toBe(true);
    });

    it("correctly identifies categorical data as non-chronological", () => {
      const ramTasks = [
        "Basic browsing, email, streaming",
        "Office work, video calls, multitasking",
        "Software development",
        "Casual and indie gaming",
        "Modern AAA gaming",
        "Photo editing",
        "Video editing (1080p)",
        "Video editing (4K)",
        "Running local AI models",
      ];
      expect(isChronologicalSeries(ramTasks)).toBe(false);
    });

    it("returns false for empty or single element lists", () => {
      expect(isChronologicalSeries([])).toBe(false);
      expect(isChronologicalSeries(["2024"])).toBe(false);
      expect(isChronologicalSeries(null as any)).toBe(false);
    });
  });
});
