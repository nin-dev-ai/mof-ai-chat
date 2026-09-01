import React, { useLayoutEffect, useRef, useState, useEffect, ReactNode, useMemo } from "react";
import * as am5 from "@amcharts/amcharts5";
import am5themes_Animated from "@amcharts/amcharts5/themes/Animated";
import { BrickWall, ChartArea, ChartBar, ChartCandlestick, ChartColumn, ChartColumnStacked, ChartLine, ChartScatter, Dice5, Donut, Funnel, Globe2, TrendingDown } from "lucide-react";
import {
  AreaChart,
  BarChart,
  CandlestickChart,
  ChordChart,
  ColumnChart,
  FunnelChart,
  GeoChart,
  LineChart,
  PieChart,
  SankeyChart,
  ScatterChart,
  StackedColumnChart,
  TreemapChart,
} from "./ChartTypes";
import { ThemeColors } from "../WeaveAiChat";
import {
  ChartBarIcon,
  ChartPieIcon,
  ChevronDownIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import am5themes_Responsive from "@amcharts/amcharts5/themes/Responsive";




export interface ChartState {
  chartDisplay: boolean;
  chartType: number;
  chartData: any;
  altType: number[];
  messageID: number;
}
interface ChartType {
  id: string;
  chartId: number;
  name: string;
  description: string;
  icon: any;
}
let chartTypes : ChartType[] = [
  {
    id: "column",
    chartId: 13,
    name: "Column Chart",
    description: "Compare values across categories",
    icon: ChartColumn,
  },
  {
    id: "pie",
    chartId: 2,
    name: "Pie Chart",
    description: "Show parts of a whole",
    icon: ChartPieIcon,
  },
  {
    id: "donut",
    chartId: 3,
    name: "Donut Chart",
    description: "Show parts of a whole (donut style)",
    icon: Donut,
  },
  {
    id: "treemap",
    chartId: 4,
    name: "Treemap",
    description: "Visualize hierarchical data",
    icon: BrickWall,
  },
  {
    id: "stackedColumn",
    chartId: 5,
    name: "Stacked Column",
    description: "Compare parts of a whole across categories",
    icon: ChartColumnStacked,
  },
  {
    id: "sankey",
    chartId: 6,
    name: "Sankey Diagram",
    description: "Show flow between stages or nodes",
    icon: TrendingDown,
  },
  {
    id: "funnel",
    chartId: 7,
    name: "Funnel Chart",
    description: "Show progressive reduction",
    icon: Funnel,
  },
  {
    id: "candlestick",
    chartId: 8,
    name: "Candlestick Chart",
    description: "Show stock price movements",
    icon: ChartCandlestick,
  },
  {
    id: "scatter",
    chartId: 9,
    name: "Scatter Plot",
    description: "Visualize correlations between variables",
    icon: ChartScatter,
  },
  {
    id: "geo",
    chartId: 10,
    name: "Geo Chart",
    description: "Map data to geographic regions",
    icon: Globe2,
  },
  {
    id: "chord",
    chartId: 11,
    name: "Chord Diagram",
    description: "Show relationships between groups",
    icon: Dice5,
  },
  {
    id: "bar",
    chartId: 12,
    name: "Bar Chart",
    description: "Compare values across categories",
    icon: ChartBar,
  },
  {
    id: "line",
    chartId: 1,
    name: "Line Chart",
    description: "Show trends over time",
    icon: ChartLine,
  },
  {
    id: "area",
    chartId: 14,
    name: "Area Chart",
    description: "Show trends over time",
    icon: ChartArea,
  },
];

export const useAmChart = (
  renderer: (root: am5.Root, container: am5.Container) => void,
  deps: any[]
) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const amRootRef = useRef<any>(null);

  useLayoutEffect(() => {
    if (!ref.current) return;
    if (amRootRef.current) {
      amRootRef.current.dispose();
      amRootRef.current = null;
    }
    const root = am5.Root.new(ref.current);
    amRootRef.current = root;
    root.setThemes([
      am5themes_Animated.new(root),
      am5themes_Responsive.new(root),
    ]);
    renderer(root, root.container);
    root._logo?.dispose();

    return () => {
      if (amRootRef.current) amRootRef.current.dispose();
      amRootRef.current = null;
    };
  }, deps);

  return ref;
};

export const parseDate = (d: string | number | Date) => {
  if (d instanceof Date) return d;
  if (typeof d === "number") return new Date(d);
  return new Date(d);
};

export const RenderChart = ({
  setChartState,
  chartState,
  themeColors,
  isFullScreen,
  isLandscape,
  onclose
}: {
  setChartState: React.Dispatch<React.SetStateAction<ChartState>>;
  chartState: ChartState;
  themeColors: ThemeColors;
  isFullScreen?: boolean;
  isLandscape?: boolean
  onclose?: () => void
}) => {
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [selectedChartType, setSelectedChartType] = useState("column");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [sortOption, setSortOption] = useState<'none' | 'value-desc' | 'value-asc' | 'name-asc' | 'name-desc'>('none');

  const filteredChartTypes = useMemo(
    () =>
      chartTypes.filter((chartType) =>
        chartState.altType.includes(chartType.chartId)
      ),
    [chartState.altType]
  );

  useEffect(() => {
    const matched = chartTypes.find(
      (type) => type.chartId === chartState.chartType
    );
    setSelectedChartType(matched?.id || "column");
  }, [chartState.chartType]);



  const handleChartTypeSelection = (type: any) => {
    if (!type) return;
    setChartState((prev) => ({
      ...prev,
      chartType: type.chartId,
    }));
    setSelectedChartType(type.id);
    setShowTypeSelector(false);
  };

  const selectedType = filteredChartTypes.find(
    (type) => type.id === selectedChartType
  );
  
  const SelectedIcon = selectedType?.icon;

  const containerClasses = isFullScreen 
    ? `w-full h-full max-h-screen flex flex-col bg-gradient-to-br from-[#FAF8F3] via-white to-[#FFF9E8] rounded-xl border border-[rgba(198,167,93,0.28)] shadow-sm`
    : "w-[70vw] md:w-[35rem] overflow-x-auto overflow-y-auto bg-gradient-to-br from-[#FAF8F3] via-white to-[#FFF9E8] rounded-xl border border-[rgba(198,167,93,0.28)] shadow-sm mt-2";
  
  const chartContainerClasses = isFullScreen
    ? `flex-1 w-full min-h-0 overflow-x-auto overflow-y-auto`
    : "w-[80vw] md:w-full h-[30vh] md:h-[35vh] lg:h-[45vh] overflow-x-auto overflow-y-auto";

  const sortedChartData = useMemo(() => {
    if (!chartState.chartData || !chartState.chartData.data) return chartState.chartData;
    
    const sorted = { ...chartState.chartData };
    const dataCopy = [...sorted.data];
    
    if (sortOption === 'value-desc') {
      // Sort by value: Highest to Lowest
      const valueField = sorted.yField || sorted.series?.[0]?.valueYField;
      dataCopy.sort((a, b) => (b[valueField] || 0) - (a[valueField] || 0));
    } else if (sortOption === 'value-asc') {
      // Sort by value: Lowest to Highest
      const valueField = sorted.yField || sorted.series?.[0]?.valueYField;
      dataCopy.sort((a, b) => (a[valueField] || 0) - (b[valueField] || 0));
    } else if (sortOption === 'name-asc') {
      // Sort alphabetically: A-Z
      const nameField = sorted.xField || sorted.series?.[0]?.categoryXField;
      dataCopy.sort((a, b) => {
        const nameA = String(a[nameField] || '').toLowerCase();
        const nameB = String(b[nameField] || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });
    } else if (sortOption === 'name-desc') {
      // Sort alphabetically: Z-A
      const nameField = sorted.xField || sorted.series?.[0]?.categoryXField;
      dataCopy.sort((a, b) => {
        const nameA = String(a[nameField] || '').toLowerCase();
        const nameB = String(b[nameField] || '').toLowerCase();
        return nameB.localeCompare(nameA);
      });
    }
    
    sorted.data = dataCopy;
    return sorted;
  }, [chartState.chartData, sortOption]);

  const limitedChartData = useMemo(() => {
    if (isFullScreen || !sortedChartData) return sortedChartData;
    
    const limited = { ...sortedChartData };
    if (Array.isArray(limited.data)) {
      limited.data = limited.data.slice(0, 4);
    }
    return limited;
  }, [isFullScreen, sortedChartData]);

  const totalDataCount = chartState.chartData?.data?.length || 0;
  const showingLimitedData = !isFullScreen && totalDataCount > 4;

  return (
    <div className={containerClasses+" relative"}>
       <button onClick={onclose} className="block sm:hidden absolute left-0 top-0 p-2 hover:bg-gray-100  rounded-lg transition-colors">
          <XMarkIcon className="w-5 h-5 text-gray-500" />
        </button>
      <div className="flex items-center justify-between m-2 sm:m-3 flex-shrink-0 ml-[2rem]">
       
        <div className="text-center flex-1">
          <div className="text-base sm:text-lg font-semibold text-gray-800 mb-0.5 sm:mb-1">
            {chartState.chartData?.series?.[0]?.name}
          </div>
          <p className="text-xs sm:text-sm text-gray-500">
            {chartState.chartData?.series?.[0]?.h2}
          </p>
          <div
            className="w-16 h-0.5 mx-auto mt-1 sm:mt-2"
            style={{
              backgroundImage: `linear-gradient(to right, ${themeColors.primary}, ${themeColors.secondary})`,
            }}
          ></div>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Sort Menu - Only show in fullscreen */}
          {isFullScreen && (
            <div className="relative">
              <button
                onClick={() => setShowSortMenu(!showSortMenu)}
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-xs sm:text-sm"
              >
                <svg
                  className="w-3.5 h-3.5 sm:w-4 sm:h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4"
                  />
                </svg>
                <span className="hidden sm:inline">Sort</span>
                <ChevronDownIcon
                  className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform duration-300 ${
                    showSortMenu ? "rotate-180" : ""
                  }`}
                />
              </button>

              {showSortMenu && (
                <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-56">
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setSortOption("none");
                        setShowSortMenu(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left text-sm ${
                        sortOption === "none" ? "bg-[rgba(198,167,93,0.10)]" : ""
                      }`}
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 6h16M4 12h16M4 18h16"
                        />
                      </svg>
                      <span
                        style={{
                          color:
                            sortOption === "none"
                              ? themeColors.primary
                              : undefined,
                        }}
                      >
                        Default Order
                      </span>
                    </button>

                    <div className="border-t border-gray-100 my-1"></div>

                    <button
                      onClick={() => {
                        setSortOption("value-desc");
                        setShowSortMenu(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left text-sm ${
                        sortOption === "value-desc" ? "bg-[rgba(198,167,93,0.10)]" : ""
                      }`}
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"
                        />
                      </svg>
                      <span
                        style={{
                          color:
                            sortOption === "value-desc"
                              ? themeColors.primary
                              : undefined,
                        }}
                      >
                        Value: High to Low
                      </span>
                    </button>

                    <button
                      onClick={() => {
                        setSortOption("value-asc");
                        setShowSortMenu(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left text-sm ${
                        sortOption === "value-asc" ? "bg-[rgba(198,167,93,0.10)]" : ""
                      }`}
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 4h13M3 8h9m-9 4h6m4 0l4 4m0 0l4-4m-4 4V8"
                        />
                      </svg>
                      <span
                        style={{
                          color:
                            sortOption === "value-asc"
                              ? themeColors.primary
                              : undefined,
                        }}
                      >
                        Value: Low to High
                      </span>
                    </button>

                    <div className="border-t border-gray-100 my-1"></div>

                    <button
                      onClick={() => {
                        setSortOption("name-asc");
                        setShowSortMenu(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left text-sm ${
                        sortOption === "name-asc" ? "bg-[rgba(198,167,93,0.10)]" : ""
                      }`}
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4"
                        />
                      </svg>
                      <span
                        style={{
                          color:
                            sortOption === "name-asc"
                              ? themeColors.primary
                              : undefined,
                        }}
                      >
                        Name: A-Z
                      </span>
                    </button>

                    <button
                      onClick={() => {
                        setSortOption("name-desc");
                        setShowSortMenu(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left text-sm ${
                        sortOption === "name-desc" ? "bg-[rgba(198,167,93,0.10)]" : ""
                      }`}
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4 4m4-4l-4 4"
                        />
                      </svg>
                      <span
                        style={{
                          color:
                            sortOption === "name-desc"
                              ? themeColors.primary
                              : undefined,
                        }}
                      >
                        Name: Z-A
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {filteredChartTypes.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowTypeSelector(!showTypeSelector)}
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-xs sm:text-sm"
              >
                {SelectedIcon && (
                  <SelectedIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                )}
                <span className="max-w-[80px] sm:max-w-none truncate sm:truncate-none">
                  {selectedType?.name}
                </span>
                <ChevronDownIcon
                  className={`w-3.5 h-3.5 sm:w-4 sm:h-4 sm:ml-2 transition-transform duration-300 ${
                    showTypeSelector ? "rotate-180" : ""
                  }`}
                />
              </button>

              {showTypeSelector && (
                <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-64 max-h-72 overflow-y-auto">
                  {filteredChartTypes.map((type) => {
                    const Icon = type.icon;
                    const isSelected = selectedChartType === type.id;
                    return (
                      <button
                        key={type.id}
                        onClick={() => handleChartTypeSelection(type)}
                        className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left ${
                          isSelected ? "bg-[rgba(198,167,93,0.10)] border-r-2" : ""
                        }`}
                        style={isSelected ? { borderRightColor: themeColors.primary } : undefined}
                      >
                        {Icon && (
                          <Icon
                            className="w-5 h-5 mt-0.5"
                            style={{
                              color: isSelected
                                ? themeColors.primary
                                : undefined,
                            }}
                          />
                        )}
                        <div>
                          <div
                            className="font-medium"
                            style={{
                              color: isSelected
                                ? themeColors.primary
                                : undefined,
                            }}
                          >
                            {type.name}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {type.description}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <div className={chartContainerClasses}>
        <ChartRenderer
          chartType={chartState.chartType}
          chartData={limitedChartData}
          themeColors={themeColors}
        />
      </div>
      {showingLimitedData && (
        <div className="px-4 pb-3 text-center">
          <p className="text-xs text-gray-600">
            Showing first 4 of {totalDataCount} data points. Click "View Full Chart" to see all data.
          </p>
        </div>
      )}
    </div>
  );
};

export const ChartRenderer = ({
  chartType,
  chartData,
  themeColors,
}: {
  chartType: number;
  chartData: any[];
  themeColors: ThemeColors;
}) => {
  // Column is the fallback for missing or unsupported chart types.
  switch (Number(chartType) || 13) {
    case 1:
      return <LineChart data={chartData} themeColors={themeColors} />;
    case 2:
      return <PieChart chartData={chartData} themeColors={themeColors} />;
    case 3:
      return (
        <PieChart chartData={chartData}  donut={true} themeColors={themeColors} />
      );
    case 4:
      return <TreemapChart chartData={chartData} />;
    case 5:
      return <StackedColumnChart chartData={chartData} />;
    case 6:
      return <SankeyChart data={chartData} />;
    case 7:
      return <FunnelChart chartData={chartData} />;
    case 8:
      return <CandlestickChart data={chartData} />;
    case 9:
      return <ScatterChart data={chartData} />;
    case 10:
      return <GeoChart data={chartData} />;
    case 11:
      return <ChordChart data={chartData} />;
    case 12:
      return <BarChart chartData={chartData} themeColors={themeColors} />;
    case 13:
      return <ColumnChart chartData={chartData} themeColors={themeColors} />;
    case 14:
      return <AreaChart chartData={chartData} themeColors={themeColors} />;
    default:
      return <ColumnChart chartData={chartData} themeColors={themeColors} />;
  }
};
