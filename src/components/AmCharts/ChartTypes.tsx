import React, { useEffect } from "react";
import { parseDate, useAmChart } from "./Amchart";
import * as am5xy from "@amcharts/amcharts5/xy";
import * as am5percent from "@amcharts/amcharts5/percent";
import * as am5hierarchy from "@amcharts/amcharts5/hierarchy";
import * as am5map from "@amcharts/amcharts5/map";
import * as am5 from "@amcharts/amcharts5";
import * as am5flow from "@amcharts/amcharts5/flow";
import { ThemeColors } from "../WeaveAiChat";
import { motion } from "framer-motion";

const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

/**
 * Chart payloads created before the current workflow can have different
 * top-level field names and series field names. Resolve the field from the
 * data itself so compatible cartesian chart renderers keep the same values.
 */
const resolveDataField = (
  rows: Array<Record<string, unknown>>,
  candidates: Array<string | undefined>
) => {
  for (const candidate of candidates) {
    if (!candidate) continue;

    const exactMatch = rows.some((row) => Object.prototype.hasOwnProperty.call(row, candidate));
    if (exactMatch) return candidate;

    const normalizedCandidate = candidate.toLowerCase();
    const matchingKey = rows
      .flatMap((row) => Object.keys(row))
      .find((key) => key.toLowerCase() === normalizedCandidate);
    if (matchingKey) return matchingKey;
  }

  return undefined;
};

const toFiniteNumber = (value: unknown) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (value === null || value === undefined || String(value).trim() === "") return undefined;

  // AI responses in Arabic may contain Arabic/Persian digits and locale
  // separators (for example: ١٬٢٠٠٫٥). Convert them before parsing.
  const normalizedValue = String(value)
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/٬/g, "")
    .replace(/٫/g, ".")
    .replace(/[^0-9.-]/g, "");
  if (!normalizedValue) return undefined;

  const parsed = Number(normalizedValue);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const normalizeCartesianData = (chartData: any) => {
  if (!Array.isArray(chartData?.data)) return undefined;

  const rows = chartData.data as Array<Record<string, unknown>>;
  const xField = resolveDataField(rows, [
    chartData.series?.[0]?.categoryXField,
    chartData.xField,
  ]);
  const yField = resolveDataField(rows, [
    chartData.series?.[0]?.valueYField,
    chartData.yField,
  ]);
  if (!xField || !yField) return undefined;

  const data = rows
    .map((row) => {
      const value = toFiniteNumber(row[yField]);
      if (value === undefined) return null;
      return { ...row, [xField]: String(row[xField] ?? ""), [yField]: value };
    })
    .filter(Boolean) as Array<Record<string, unknown>>;

  return data.length > 0 ? { data, xField, yField } : undefined;
};
// Utility function to format large numbers with K, M, B notation
const formatDataLabel = (value: number): string => {
  if (value === null || value === undefined || isNaN(value))
    return String(value);

  const absValue = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  if (absValue >= 1e9) {
    // Billions
    return (
      sign +
      (absValue / 1e9).toFixed(absValue >= 10e9 ? 1 : 2).replace(/\.?0+$/, "") +
      "B"
    );
  } else if (absValue >= 1e6) {
    // Millions
    return (
      sign +
      (absValue / 1e6).toFixed(absValue >= 10e6 ? 1 : 2).replace(/\.?0+$/, "") +
      "M"
    );
  } else if (absValue >= 1e3) {
    // Thousands
    return (
      sign +
      (absValue / 1e3).toFixed(absValue >= 10e3 ? 0 : 1).replace(/\.?0+$/, "") +
      "k"
    );
  } else {
    // Less than 1000 - show as is
    return sign + absValue.toString();
  }
};

const AXIS_TITLE_COLOR = am5.color(0x666666);

const applyXyChartGutters = (
  chart: am5xy.XYChart,
  options?: { left?: number; right?: number; top?: number; bottom?: number }
) => {
  chart.setAll({
    paddingLeft: options?.left ?? 90,
    paddingRight: options?.right ?? 20,
    paddingTop: options?.top ?? 24,
    paddingBottom: options?.bottom ?? 56,
  });
  chart.plotContainer.set("maskContent", false);
};

const addCategoryValueAxisTitles = (
  root: am5.Root,
  xAxis: am5xy.Axis<am5xy.AxisRenderer>,
  yAxis: am5xy.Axis<am5xy.AxisRenderer>,
  xTitle: string,
  yTitle: string,
  options?: { yTitleAfterRenderer?: boolean }
) => {
  const yLabel = am5.Label.new(root, {
    text: capitalize(yTitle),
    rotation: -90,
    fontWeight: "600",
    fontSize: 12,
    fill: AXIS_TITLE_COLOR,
    y: am5.p50,
    centerX: am5.p50,
    centerY: am5.p50,
  });

  if (options?.yTitleAfterRenderer) {
    yAxis.children.push(yLabel);
  } else {
    yAxis.children.unshift(yLabel);
  }

  xAxis.children.push(
    am5.Label.new(root, {
      text: capitalize(xTitle),
      fontWeight: "600",
      fontSize: 12,
      fill: AXIS_TITLE_COLOR,
      x: am5.p50,
      centerX: am5.p50,
      paddingTop: 12,
    })
  );
};

const addCenteredValueBullet = (
  root: am5.Root,
  series: am5xy.ColumnSeries,
  options: {
    valueKey: "valueY" | "valueX";
    locationX: number;
    locationY: number;
    centerX?: number;
    centerY?: number;
    dx?: number;
    dy?: number;
    fill?: number;
  }
) => {
  series.bullets.push(() => {
    const bulletLabel = am5.Label.new(root, {
      centerX: options.centerX ?? am5.p50,
      centerY: options.centerY ?? am5.p50,
      dx: options.dx ?? 0,
      dy: options.dy ?? 0,
      fontSize: 11,
      fontWeight: "600",
      fill: am5.color(options.fill ?? 0xffffff),
      textAlign: "center",
      direction: "ltr",
      oversizedBehavior: "none",
    });

    bulletLabel.adapters.add("text", (_text, target) => {
      const dataItem =
        target.dataItem as am5.DataItem<am5xy.IColumnSeriesDataItem>;
      const value = dataItem?.get(options.valueKey);
      if (value === undefined || value === null) return "";
      return formatDataLabel(Number(value));
    });

    return am5.Bullet.new(root, {
      locationX: options.locationX,
      locationY: options.locationY,
      sprite: bulletLabel,
    });
  });
};

// Utility function to get responsive label settings
const getResponsiveLabelSettings = (
  containerWidth: number,
  dataLength: number = 0
) => {
  // Calculate optimal spacing to ensure all labels fit
  const availableWidth = containerWidth - 100; // Account for margins
  const optimalSpacing = Math.max(50, availableWidth / Math.max(dataLength, 1));

  // Adjust settings based on both container width and data density
  const baseSettings = {
    small: {
      fontSize: "0.65em",
      rotation: -45,
      maxWidth: am5.percent(70),
      minGridDistance: Math.min(optimalSpacing, 100),
    },
    medium: {
      fontSize: "0.7em",
      rotation: -30,
      maxWidth: am5.percent(75),
      minGridDistance: Math.min(optimalSpacing, 80),
    },
    large: {
      fontSize: "0.75em",
      rotation: -15,
      maxWidth: am5.percent(80),
      minGridDistance: Math.min(optimalSpacing, 70),
    },
  };

  // Adjust for data density with dynamic spacing
  if (dataLength > 15) {
    // Many data points - ensure adequate spacing
    if (containerWidth < 400) {
      return {
        ...baseSettings.small,
        minGridDistance: Math.max(80, optimalSpacing),
        rotation: -60,
      };
    } else if (containerWidth < 600) {
      return {
        ...baseSettings.medium,
        minGridDistance: Math.max(70, optimalSpacing),
        rotation: -45,
      };
    } else {
      return {
        ...baseSettings.large,
        minGridDistance: Math.max(60, optimalSpacing),
        rotation: -30,
      };
    }
  } else if (dataLength > 8) {
    // Medium data points
    if (containerWidth < 400) {
      return {
        ...baseSettings.small,
        minGridDistance: Math.max(70, optimalSpacing),
      };
    } else if (containerWidth < 600) {
      return {
        ...baseSettings.medium,
        minGridDistance: Math.max(60, optimalSpacing),
      };
    } else {
      return {
        ...baseSettings.large,
        minGridDistance: Math.max(50, optimalSpacing),
      };
    }
  } else {
    // Few data points - can use normal settings
    if (containerWidth < 400) {
      return baseSettings.small;
    } else if (containerWidth < 600) {
      return baseSettings.medium;
    } else {
      return baseSettings.large;
    }
  }
};

export const LineChart = ({
  data,
  themeColors,
}: {
  data: any;
  themeColors: { primary: string; secondary: string };
}) => {
  const ref = useAmChart(
    (root, container) => {
      const normalizedData = normalizeCartesianData(data);
      if (!normalizedData) {
        console.error("Line chart has no valid mapped data:", data);
        return;
      }
      const { data: lineData, xField, yField } = normalizedData;

      // ✅ Use root.container (not container.children)
      const chart = root.container.children.push(
        am5xy.XYChart.new(root, {
          panX: true,
          panY: true,
          wheelX: "panX",
          wheelY: "zoomX",
          pinchZoomX: true,
          pinchZoomY: true,
          layout: root.verticalLayout,
        })
      );
      applyXyChartGutters(chart, { top: 36, left: 90 });

      const containerWidth = container.width() || 600;
      const responsiveSettings = getResponsiveLabelSettings(
        containerWidth,
        lineData.length
      );

      // X-Axis Setup
      const xAxisRenderer = am5xy.AxisRendererX.new(root, {
        minGridDistance: responsiveSettings.minGridDistance,
        cellStartLocation: 0.1,
        cellEndLocation: 0.9,
      });

      xAxisRenderer.labels.template.setAll({
        oversizedBehavior: "none",
        fontSize: 11,
        textAlign: "center",
        centerX: am5.p50,
        centerY: 0,
        paddingTop: 10,
        rotation: Math.min(Math.abs(Number(responsiveSettings.rotation) || 30), 35) * -1,
        multiLocation: 0.5,
      });

      const xAxis = chart.xAxes.push(
        am5xy.CategoryAxis.new(root, {
          categoryField: xField,
          renderer: xAxisRenderer,
          maxZoomCount: lineData.length || 10,
        })
      );

      // ✅ Assign data to X Axis
      xAxis.data.setAll(lineData);

      // Y-Axis Setup
      const yAxisRenderer = am5xy.AxisRendererY.new(root, {
        minGridDistance: 40,
      });

      yAxisRenderer.labels.template.setAll({
        fontSize: "0.75em",
        paddingRight: 8,
        oversizedBehavior: "none",
      });

      const yAxis = chart.yAxes.push(
        am5xy.ValueAxis.new(root, {
          renderer: yAxisRenderer,
          numberFormat: "#,###.#a",
          extraMax: 0.18,
        })
      );

      addCategoryValueAxisTitles(root, xAxis, yAxis, xField, yField);

      // Cursor
      const cursor = am5xy.XYCursor.new(root, {
        behavior: "zoomX",
        xAxis,
        yAxis,
      });

      cursor.lineX.setAll({
        stroke: am5.color(themeColors.primary),
        strokeDasharray: [4, 4],
        strokeOpacity: 0.7,
      });

      cursor.lineY.setAll({
        stroke: am5.color(themeColors.primary),
        strokeDasharray: [4, 4],
        strokeOpacity: 0.7,
      });

      chart.set("cursor", cursor);

      // Tooltip
      const tooltip = am5.Tooltip.new(root, {
        labelText: `{${xField}}: [bold]{${yField}}[/]`, // ✅ Y value in bold
        getFillFromSprite: false,
        getStrokeFromSprite: false,
        autoTextColor: false,
        pointerOrientation: "vertical",
        background: am5.RoundedRectangle.new(root, {
          fill: am5.color(0xffffff),
          stroke: am5.color(themeColors.primary),
          strokeWidth: 2,
        }),
      });

      // Label styling
      tooltip.label.setAll({
        fill: am5.color(0x000000), // black text
        fontSize: 13,
        fontWeight: "500",
        paddingTop: 10,
        paddingBottom: 10,
        paddingLeft: 14,
        paddingRight: 14,
      });

      // Series
      const series = chart.series.push(
        am5xy.LineSeries.new(root, {
          xAxis,
          yAxis,
          valueYField: yField,
          categoryXField: xField,
          name: data.series?.[0]?.name ?? "",
          fill: am5.color(themeColors.primary),
          stroke:  am5.color(themeColors.primary),
          tooltip,
          sequencedInterpolation: true,
        })
      );

      // ✅ Assign data to Series
      series.data.setAll(lineData);

      // Line Style
      series.strokes.template.setAll({
        strokeWidth: 3,
        shadowColor:am5.color(0x000000),
        shadowBlur: 6,
        shadowOffsetX: 0,
        shadowOffsetY: 2,
        shadowOpacity: 0.3,
      });

      // Gradient fill under line
      series.fills.template.setAll({
        fillGradient: am5.LinearGradient.new(root, {
          stops: [
            { color: am5.color(themeColors.primary), opacity: 0.3 },
            { color: am5.color(themeColors.primary), opacity: 0 },
          ],
          rotation: 90,
        }),
        fillOpacity: 1,
        visible: true,
      });

      // Bullets (data points)
      series.bullets.push(() =>
        am5.Bullet.new(root, {
          sprite: am5.Circle.new(root, {
            radius: 5,
            fill: am5.color(themeColors.primary),
            stroke: am5.color(0xffffff),
            strokeWidth: 2,
            shadowColor: am5.color(0x000000),
            shadowBlur: 4,
            shadowOffsetX: 0,
            shadowOffsetY: 2,
            shadowOpacity: 0.2,
          }),
        })
      );

      // Value labels above points
      series.bullets.push(function () {
        const bulletLabel = am5.Label.new(root, {
          centerY: am5.p100,
          centerX: am5.p50,
          dy: -8,
          fontSize: 11,
          fontWeight: "600",
          textAlign: "center",
          direction: "ltr",
          populateText: false,
        });

        bulletLabel.adapters.add("text", function (text, target) {
          const dataItem =
            target.dataItem as am5.DataItem<am5xy.IXYSeriesDataItem>;
          if (dataItem) {
            const value = dataItem.get("valueY");
            if (value !== undefined && value !== null) {
              return formatDataLabel(value);
            }
          }
          return "";
        });

        return am5.Bullet.new(root, {
          locationX: 0.5,
          locationY: 1,
          sprite: bulletLabel,
        });
      });

      // Scrollbar for large datasets
      const visibleCount = 4;
      const totalCount = lineData.length;

      if (totalCount >= visibleCount) {
        const scrollbarX = am5xy.XYChartScrollbar.new(root, {
          orientation: "horizontal",
        });
        chart.set("scrollbarX", scrollbarX);

        if (totalCount > visibleCount) {
          xAxis.set("start", 0);
          xAxis.set("end", visibleCount / totalCount);
          xAxis.set("minZoomCount", visibleCount);
        }
      }

      series.appear(1000);
      chart.appear(1000, 100);
    },
    [JSON.stringify(data), themeColors]
  );

  return (
    <motion.div
      ref={ref}
      className="w-full h-full"
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      style={{ overflow: "visible", direction: "ltr" }}
    />
  );
};

export const PieChart = ({
  chartData,
  themeColors,
  donut = false,
}: {
  chartData: any;
  themeColors: ThemeColors;
  donut?: boolean;
}) => {
  const ref = useAmChart(
    (root, container) => {
      const { data, xField, yField, series } = chartData;
      const chart = container.children.push(
        am5percent.PieChart.new(root, {
          layout: root.verticalLayout,
          innerRadius: donut ? am5.percent(50) : 0,
        })
      );
      const pieSeries = chart.series.push(
        am5percent.PieSeries.new(root, {
          valueField: yField,
          categoryField: xField,
          tooltip: am5.Tooltip.new(root, {
            labelText: "{category} : {value.formatNumber('#,###.#a')}",
          }),
        })
      );

      pieSeries.labels.template.adapters.add("text", function (text, target) {
        const dataItem = target.dataItem;
        if (dataItem) {
          const value = dataItem.get("value");
          const category = dataItem.get("category");
          if (value !== undefined && category !== undefined) {
            return `${category} : ${formatDataLabel(value)}`;
          }
        }
        return text;
      });
      // Set data
      if (Array.isArray(data)) {
        pieSeries.data.setAll(data);
      }

      chart.appear(1000, 100);
    },
    [JSON.stringify(chartData), donut]
  );
  return <div ref={ref} className="w-full h-full" />;
};

export const BarChart = ({
  chartData,
  themeColors,
}: {
  chartData: any;
  themeColors: ThemeColors;
}) => {
  const ref = useAmChart(
    (root, container) => {
      const normalizedData = normalizeCartesianData(chartData);
      const series = chartData?.series;
      if (!normalizedData || !series || !series.length) {
        console.error("Invalid chartData:", chartData);
        return;
      }
      const { data, xField, yField } = normalizedData;
      const chart = root.container.children.push(
        am5xy.XYChart.new(root, {
          panX: true,
          panY: true,
          wheelX: "panX",
          wheelY: "zoomY",
          pinchZoomX: true,
          pinchZoomY: true,
          layout: root.horizontalLayout,
        })
      );
      applyXyChartGutters(chart, { left: 96, bottom: 56, top: 16, right: 64 });

      const yAxisRenderer = am5xy.AxisRendererY.new(root, {
        minGridDistance: 20,
        cellStartLocation: 0.1,
        cellEndLocation: 0.9,
      });
      yAxisRenderer.labels.template.setAll({
        fontSize: 11,
        paddingRight: 8,
        oversizedBehavior: "none",
        textAlign: "right",
      });

      const yAxis = chart.yAxes.push(
        am5xy.CategoryAxis.new(root, {
          categoryField: xField,
          renderer: yAxisRenderer,
        })
      );
      yAxis.data.setAll(data);
      const xAxisRenderer = am5xy.AxisRendererX.new(root, {
        minGridDistance: 60, // Increased spacing
      });
      xAxisRenderer.labels.template.setAll({
        centerY: am5.p50,
        centerX: am5.p100,
        paddingRight: -10,
        oversizedBehavior: "fit",
        fontSize: "0.75em", // Relative font size
        paddingTop: 10,
        maxWidth: am5.percent(90) as unknown as number,
      });

      const xAxis = chart.xAxes.push(
        am5xy.ValueAxis.new(root, {
          renderer: xAxisRenderer,
          min: 0,
          extraMax: 0.22,
          numberFormat: "#,###.#a",
        })
      );

      addCategoryValueAxisTitles(root, xAxis, yAxis, yField, xField, {
        yTitleAfterRenderer: true,
      });

      const cursor = am5xy.XYCursor.new(root, {
        behavior: "zoomY",
        xAxis,
        yAxis,
        snapToSeries: chart.series.values,
        snapToSeriesBy: "x",
      });

      cursor.lineX.setAll({
        stroke: am5.color(themeColors.primary),
        strokeDasharray: [4, 4],
        strokeOpacity: 0.7,
      });

      cursor.lineY.setAll({
        stroke: am5.color(themeColors.primary),
        strokeDasharray: [4, 4],
        strokeOpacity: 0.7,
      });

      chart.set("cursor", cursor);

      const gradient = am5.LinearGradient.new(root, {
        stops: [
          { color: am5.color(themeColors.primary), offset: 0 },
          { color: am5.color(themeColors.secondary), offset: 1 },
        ],
        rotation: 90,
      });

      chartData.series.forEach((s: any) => {
        const newSeries = chart.series.push(
          am5xy.ColumnSeries.new(root, {
            name: s.name,
            xAxis,
            yAxis,
            valueXField: yField,
            categoryYField: xField,
            sequencedInterpolation: true,
          })
        );

        // Create gradient for horizontal bars
        const gradient = am5.LinearGradient.new(root, {
          stops: [
            {
              color: am5.color(themeColors.primary),
            },
            {
              color: am5.Color.lighten(am5.color(themeColors.primary), 0.3),
              opacity: 0.9,
            },
          ],
          rotation: 0,
        });

        newSeries.columns.template.setAll({
          tooltipText:
            "{categoryY}: [bold]{valueX.formatNumber('#,###.#a')}[/]",
          fillGradient: gradient,
          strokeWidth: 0,
          strokeOpacity: 0,
          cornerRadiusTL: 0,
          shadowColor: am5.color(0x000000),
          shadowBlur: 8,
          shadowOffsetX: 4,
          shadowOffsetY: 0,
          shadowOpacity: 0.15,
        });

        // Add hover effects
        newSeries.columns.template.states.create("hover", {
          fillGradient: am5.LinearGradient.new(root, {
            stops: [
              {
                color: am5.Color.brighten(am5.color(themeColors.primary), 0.2),
              },
              {
                color: am5.Color.lighten(am5.color(themeColors.primary), 0.4),
                opacity: 0.95,
              },
            ],
            rotation: 0,
          }),
          shadowBlur: 12,
          shadowOffsetX: 6,
          shadowOpacity: 0.25,
        });

        // Customize tooltip styling
        const tooltip = am5.Tooltip.new(root, {
          pointerOrientation: "horizontal",
          getFillFromSprite: false,
          getStrokeFromSprite: false,
          autoTextColor: false,
        });

        newSeries.set("tooltip", tooltip);
        newSeries.columns.template.setAll({
          tooltipText:
            "{categoryY}: [bold]{valueX.formatNumber('#,###.#a')}[/]",
        });

        const tooltipBg = tooltip.get("background");
        if (tooltipBg) {
          tooltipBg.setAll({
            fill: am5.color(0xffffff),
            fillOpacity: 1,
            stroke: am5.color(themeColors.primary),
            strokeWidth: 2,
            strokeOpacity: 1,
            shadowColor: am5.color(0x000000),
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowOffsetY: 3,
            shadowOpacity: 0.15,
          });
        }

        tooltip.label.setAll({
          fill: am5.color(0x333333),
          fontSize: 13,
          fontWeight: "500",
          paddingTop: 10,
          paddingBottom: 10,
          paddingLeft: 14,
          paddingRight: 14,
        });

        addCenteredValueBullet(root, newSeries, {
          valueKey: "valueX",
          locationX: 1,
          locationY: 0.5,
          centerX: 0,
          centerY: am5.p50,
          dx: 8,
          fill: 0x333333,
        });

        newSeries.data.setAll(data);
        newSeries.appear(1000);
      });

      const visibleCount = 4;
      const totalCount = data.length;
      if (totalCount >= visibleCount) {
        const scrollbarY = am5xy.XYChartScrollbar.new(root, {
          orientation: "vertical",
        });
        chart.set("scrollbarY", scrollbarY);

        if (totalCount > visibleCount) {
          yAxis.set("start", 0);
          yAxis.set("end", visibleCount / totalCount);
          yAxis.set("minZoomCount", visibleCount);
        }
      }

      chart.appear(1000, 100);
    },
    [JSON.stringify(chartData), themeColors]
  );

  return (
    <motion.div
      ref={ref}
      className="w-full h-full"
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      style={{ overflow: "visible", direction: "ltr" }}
    />
  );
};

export const ColumnChart = ({
  chartData,
  themeColors,
}: {
  chartData: any;
  themeColors: { primary: string; secondary: string };
}) => {
  const ref = useAmChart(
    (root, container) => {
      const { data, xField, yField, series } = chartData;

      if (!data || !xField || !yField || !series || !series.length) {
        console.error("Invalid chartData:", chartData);
        return;
      }

      const chart = root.container.children.push(
        am5xy.XYChart.new(root, {
          panX: true,
          panY: true,
          wheelX: "panY",
          wheelY: "zoomX",
          pinchZoomX: true,
          pinchZoomY: true,
          layout: root.verticalLayout,
        })
      );
      applyXyChartGutters(chart, { bottom: 60, left: 90, top: 20 });

      // Get responsive settings based on container width and data length
      const containerWidth = container.width() || 600;
      const responsiveSettings = getResponsiveLabelSettings(
        containerWidth,
        data?.length || 0
      );

      const xAxisRenderer = am5xy.AxisRendererX.new(root, {
        minGridDistance: Math.max(responsiveSettings.minGridDistance, 50),
      });
      xAxisRenderer.labels.template.setAll({
        centerX: am5.p50,
        centerY: 0,
        oversizedBehavior: "none",
        fontSize: 11,
        paddingTop: 10,
        rotation: Math.min(Math.abs(Number(responsiveSettings.rotation) || 30), 35) * -1,
        multiLocation: 0.5,
        textAlign: "center",
      });

      const xAxis = chart.xAxes.push(
        am5xy.CategoryAxis.new(root, {
          categoryField: xField,
          renderer: xAxisRenderer,
          maxZoomCount: data?.length || 10, // Ensure all labels can be shown
        })
      );

      // Ensure all labels are visible by adjusting zoom
      xAxis.set("maxZoomFactor", 1);
      xAxis.set("minZoomCount", Math.min(data?.length || 6, 6)); // Show at least 6 labels
      xAxis
        .get("renderer")
        .set("minGridDistance", responsiveSettings.minGridDistance);

      // Force label visibility on zoom
      xAxis.onPrivate("selectionMin", () => {
        xAxis.get("renderer").labels.template.set("forceHidden", false);
      });
      xAxis.onPrivate("selectionMax", () => {
        xAxis.get("renderer").labels.template.set("forceHidden", false);
      });

      xAxis.data.setAll(data);
      const yAxisRenderer = am5xy.AxisRendererY.new(root, {
        minGridDistance: 40, // Better spacing
      });
      yAxisRenderer.labels.template.setAll({
        fontSize: "0.75em",
        paddingRight: 8,
        oversizedBehavior: "none",
      });

      const yAxis = chart.yAxes.push(
        am5xy.ValueAxis.new(root, {
          renderer: yAxisRenderer,
          min: 0,
          extraMax: 0.14,
          numberFormat: "#,###.#a",
        })
      );
      addCategoryValueAxisTitles(root, xAxis, yAxis, xField, yField);

      const cursor = am5xy.XYCursor.new(root, {
        behavior: "zoomX",
        xAxis,
        yAxis,
        snapToSeries: chart.series.values,
        snapToSeriesBy: "x",
      });

      cursor.lineX.setAll({
        stroke: am5.color(themeColors.primary),
        strokeDasharray: [4, 4],
        strokeOpacity: 0.7,
      });

      cursor.lineY.setAll({
        stroke: am5.color(themeColors.primary),
        strokeDasharray: [4, 4],
        strokeOpacity: 0.7,
      });

      chart.set("cursor", cursor);

      series.forEach((s: any) => {
        const newSeries = chart.series.push(
          am5xy.ColumnSeries.new(root, {
            name: s.name,
            xAxis,
            yAxis,
            valueYField: s.valueYField,
            categoryXField: s.categoryXField,
            sequencedInterpolation: true,
          })
        );

        // Create gradient for columns
        const gradient = am5.LinearGradient.new(root, {
          stops: [
            {
              color: am5.color(themeColors.primary),
            },
            {
              color: am5.Color.lighten(am5.color(themeColors.secondary), 0.3),
              opacity: 0.9,
            },
          ],
          rotation: 90,
        });

        newSeries.columns.template.setAll({
          tooltipText:
            "{categoryX}: [bold]{valueY.formatNumber('#,###.#a')}[/]",
          fillGradient: gradient,
          strokeWidth: 0,
          strokeOpacity: 0,
          cornerRadiusTL: 4,
          cornerRadiusTR: 4,
          cornerRadiusBL: 0,
          cornerRadiusBR: 0,
          width: am5.percent(62),
          centerX: am5.p50,
          shadowColor: am5.color(0x000000),
          shadowBlur: 8,
          shadowOffsetX: 0,
          shadowOffsetY: 4,
          shadowOpacity: 0.15,
        });

        // Add hover effects
        newSeries.columns.template.states.create("hover", {
          fillGradient: am5.LinearGradient.new(root, {
            stops: [
              {
                color: am5.Color.brighten(am5.color(themeColors.primary), 0.2),
              },
              {
                color: am5.Color.lighten(am5.color(themeColors.secondary), 0.4),
                opacity: 0.95,
              },
            ],
            rotation: 90,
          }),
          shadowBlur: 12,
          shadowOffsetY: 6,
          shadowOpacity: 0.25,
        });

        // Customize tooltip styling
        const tooltip = am5.Tooltip.new(root, {
          pointerOrientation: "vertical",
          getFillFromSprite: false,
          getStrokeFromSprite: false,
          autoTextColor: false,
        });

        newSeries.set("tooltip", tooltip);
        newSeries.columns.template.setAll({
          tooltipText:
            "{categoryX}: [bold]{valueY.formatNumber('#,###.#a')}[/]",
        });

        const tooltipBg = tooltip.get("background");
        if (tooltipBg) {
          tooltipBg.setAll({
            fill: am5.color(0xffffff),
            fillOpacity: 1,
            stroke: am5.color(themeColors.primary),
            strokeWidth: 2,
            strokeOpacity: 1,
            shadowColor: am5.color(0x000000),
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowOffsetY: 3,
            shadowOpacity: 0.15,
          });
        }

        tooltip.label.setAll({
          fill: am5.color(0x333333),
          fontSize: 13,
          fontWeight: "500",
          paddingTop: 10,
          paddingBottom: 10,
          paddingLeft: 14,
          paddingRight: 14,
        });

        addCenteredValueBullet(root, newSeries, {
          valueKey: "valueY",
          locationX: 0.5,
          locationY: 0.5,
          centerX: am5.p50,
          centerY: am5.p50,
          fill: 0xffffff,
        });

        newSeries.data.setAll(data);
        newSeries.appear(1000);
      });
      const visibleCount = 4;
      const totalCount = data.length;

      if (totalCount >= visibleCount) {
        const scrollbarX = am5xy.XYChartScrollbar.new(root, {
          orientation: "horizontal",
        });
        chart.set("scrollbarX", scrollbarX);

        if (totalCount > visibleCount) {
          // Set visible range on axis (from 0 to visibleCount/totalCount)
          xAxis.set("start", 0);
          xAxis.set("end", visibleCount / totalCount);
          xAxis.set("minZoomCount", visibleCount);
        }
      }
      chart.appear(1000, 100);
    },
    [JSON.stringify(chartData), themeColors]
  );

  return (
    <motion.div
      ref={ref}
      className="w-full h-full"
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      style={{ overflow: "visible", direction: "ltr" }}
    />
  );
};

export const AreaChart = ({
  chartData,
  themeColors,
}: {
  chartData: any;
  themeColors: ThemeColors;
}) => {
  const ref = useAmChart(
    (root, container) => {
      const { data, xField, yField, series } = chartData;

      const chart = container.children.push(
        am5xy.XYChart.new(root, {
          panX: true,
          panY: true,
          wheelX: "panX",
          wheelY: "zoomX",
        })
      );

      const xAxisRenderer = am5xy.AxisRendererX.new(root, {
        minGridDistance: 20,
      });

      xAxisRenderer.labels.template.setAll({
        centerY: am5.p50,
        centerX: am5.p100,
        paddingRight: -20,
        oversizedBehavior: "wrap",
        fontSize: 12,
        paddingTop: 10,
      });
      // X Axis → Category (months)
      const xAxis = chart.xAxes.push(
        am5xy.CategoryAxis.new(root, {
          categoryField: xField,
          renderer: xAxisRenderer,
        })
      );

      const yAxisRenderer = am5xy.AxisRendererY.new(root, {});

      yAxisRenderer.labels.template.setAll({
        fontSize: 12,
        paddingRight: 10,
      });

      // Y Axis → Values
      const yAxis = chart.yAxes.push(
        am5xy.ValueAxis.new(root, {
          renderer: yAxisRenderer,
          numberFormat: "#,###.#a",
        })
      );

      // Series
      series.forEach((s: any) => {
        const areaSeries = chart.series.push(
          am5xy.LineSeries.new(root, {
            name: s.name,
            xAxis,
            yAxis,
            valueYField: s.valueYField,
            categoryXField: s.categoryXField,
            fill: am5.color(themeColors.primary),
            stroke: am5.color(themeColors.primary),
            tooltip: am5.Tooltip.new(root, {
              labelText: "{categoryX}: {valueY.formatNumber('#,###.#a')}",
            }),
          })
        );
        // Add "area fill" below line
        areaSeries.fills.template.setAll({
          fill: am5.color(themeColors.primary),
          fillOpacity: 0.3,
          visible: true,
        });

        areaSeries.strokes.template.setAll({
          strokeWidth: 2,
        });

        areaSeries.bullets.push(function () {
          const bulletLabel = am5.Label.new(root, {
            centerY: am5.p100,
            centerX: am5.p50,
            dy: -5,
            fontSize: 12,
            fontWeight: "bold",
          });

          bulletLabel.adapters.add("text", function (text, target) {
            const dataItem =
              target.dataItem as am5.DataItem<am5xy.IXYSeriesDataItem>;
            if (dataItem) {
              const value = dataItem.get("valueY");
              if (value !== undefined && value !== null) {
                return formatDataLabel(value);
              }
            }
            return "";
          });

          return am5.Bullet.new(root, {
            locationY: 1,
            sprite: bulletLabel,
          });
        });
        areaSeries.data.setAll(data);
      });

      // Bind x-axis categories
      xAxis.data.setAll(data);

      chart.appear(1000, 100);
    },
    [JSON.stringify(chartData)]
  );
  return <div ref={ref} className="w-full h-full" />;
};

export const TreemapChart = ({ chartData }: { chartData: any }) => {
  const ref = useAmChart(
    (root, container) => {
      const { data, xField, yField, series } = chartData;
      const chart = container.children.push(
        am5hierarchy.Treemap.new(root, {
          singleBranchOnly: false,
          downDepth: 1,
          upDepth: -1,
          initialDepth: 2,
          valueField: yField,
          categoryField: xField,
          childDataField: "children",
        })
      );

      chart.rectangles.template.setAll({
        strokeWidth: 2,
      });

      chart.data.setAll([{ name: "Root", children: data }]);
      chart.set("selectedDataItem", chart.dataItems[0]);
      chart.appear(1000, 100);
    },
    [JSON.stringify(chartData)]
  );
  return <div ref={ref} className="w-full h-full" />;
};

export const StackedColumnChart = ({ chartData }: { chartData: any }) => {
  const ref = useAmChart(
    (root, container) => {
      const { data, xField } = chartData;
      if (!data || !xField) {
        console.error("Invalid chartData", chartData);
        return;
      }
      const chart = container.children.push(am5xy.XYChart.new(root, {}));
      const xAxis = chart.xAxes.push(
        am5xy.CategoryAxis.new(root, {
          categoryField: xField,
          renderer: am5xy.AxisRendererX.new(root, {}),
        })
      );
      const yAxis = chart.yAxes.push(
        am5xy.ValueAxis.new(root, {
          renderer: am5xy.AxisRendererY.new(root, {}),
        })
      );
      const fields = Object.keys(data[0] || {}).filter((f) => f !== xField);
      fields.forEach((f) => {
        const series = chart.series.push(
          am5xy.ColumnSeries.new(root, {
            xAxis,
            yAxis,
            valueYField: f,
            categoryXField: xField,
            stacked: true,
          })
        );
        series.data.setAll(data);
      });
      xAxis.data.setAll(data);
    },
    [JSON.stringify(chartData)]
  );
  return <div ref={ref} />;
};

export const SankeyChart = ({ data }: { data: any[] }) => {
  const ref = useAmChart(
    (root, container) => {
      const sankey = container.children.push(am5flow.Sankey.new(root, {}));
      sankey.links.setAll(data);
    },
    [JSON.stringify(data)]
  );
  return <div ref={ref} className="w-full h-full" />;
};

export const FunnelChart = ({ chartData }: { chartData: any }) => {
  const ref = useAmChart(
    (root, container) => {
      const { data, xField, yField } = chartData;
      if (!data || !xField || !yField) {
        console.error("Invalid chartData", chartData);
        return;
      }
      const chart = container.children.push(am5xy.XYChart.new(root, {}));
      const xAxis = chart.xAxes.push(
        am5xy.CategoryAxis.new(root, {
          categoryField: xField,
          renderer: am5xy.AxisRendererX.new(root, {}),
        })
      );
      const yAxis = chart.yAxes.push(
        am5xy.ValueAxis.new(root, {
          renderer: am5xy.AxisRendererY.new(root, {}),
        })
      );
      const series = chart.series.push(
        am5xy.ColumnSeries.new(root, {
          valueYField: yField,
          categoryXField: xField,
          xAxis,
          yAxis,
        })
      );
      series.data.setAll(data);
      xAxis.data.setAll(data);
    },
    [JSON.stringify(chartData)]
  );
  return <div ref={ref} className="w-full h-full" />;
};

export const CandlestickChart = ({ data }: { data: any[] }) => {
  const ref = useAmChart(
    (root, container) => {
      const chart = container.children.push(am5xy.XYChart.new(root, {}));
      const xAxis = chart.xAxes.push(
        am5xy.DateAxis.new(root, {
          baseInterval: { timeUnit: "day", count: 1 },
          renderer: am5xy.AxisRendererX.new(root, {}),
        })
      );
      const yAxis = chart.yAxes.push(
        am5xy.ValueAxis.new(root, {
          renderer: am5xy.AxisRendererY.new(root, {}),
        })
      );
      const series = chart.series.push(
        am5xy.CandlestickSeries.new(root, {
          xAxis,
          yAxis,
          valueYField: "close",
          openValueYField: "open",
          lowValueYField: "low",
          highValueYField: "high",
          valueXField: "date",
        })
      );
      series.data.setAll(data.map((d) => ({ ...d, date: parseDate(d.date) })));
    },
    [JSON.stringify(data)]
  );
  return <div ref={ref} className="w-full h-full" />;
};

export const ScatterChart = ({ data }: { data: any[] }) => {
  const ref = useAmChart(
    (root, container) => {
      const chart = container.children.push(am5xy.XYChart.new(root, {}));
      const xAxis = chart.xAxes.push(
        am5xy.ValueAxis.new(root, {
          renderer: am5xy.AxisRendererX.new(root, {}),
        })
      );
      const yAxis = chart.yAxes.push(
        am5xy.ValueAxis.new(root, {
          renderer: am5xy.AxisRendererY.new(root, {}),
        })
      );
      const scatter = chart.series.push(
        am5xy.LineSeries.new(root, {
          xAxis,
          yAxis,
          valueXField: "x",
          valueYField: "y",
        })
      );
      scatter.strokes.template.setAll({ visible: false });
      scatter.bullets.push(() =>
        am5.Bullet.new(root, { sprite: am5.Circle.new(root, { radius: 5 }) })
      );
      scatter.data.setAll(data);
    },
    [JSON.stringify(data)]
  );
  return <div ref={ref} className="w-full h-full" />;
};

export const GeoChart = ({ data }: { data: any[] }) => {
  const ref = useAmChart(
    (root, container) => {
      const chart = container.children.push(
        am5map.MapChart.new(root, { projection: am5map.geoMercator() })
      );
      const pointSeries = am5map.MapPointSeries.new(root, {});
      chart.series.push(pointSeries);
      pointSeries.data.setAll(
        data.map((f: any) => ({
          latitude: f.geometry.coordinates[1],
          longitude: f.geometry.coordinates[0],
          name: f.properties?.name,
          value: f.properties?.value,
        }))
      );
    },
    [JSON.stringify(data)]
  );
  return <div ref={ref} className="w-full h-full" />;
};

export const ChordChart = ({ data }: { data: any[] }) => {
  const ref = useAmChart(
    (root, container) => {
      const sankey = container.children.push(am5flow.Sankey.new(root, {}));
      sankey.links.setAll(data);
    },
    [JSON.stringify(data)]
  );
  return <div ref={ref} className="w-full h-full" />;
};
