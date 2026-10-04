"use client";

import React, { useMemo, useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  ZAxis,
  LabelList
} from 'recharts';
import { motion } from 'framer-motion';
import { formatChartValue } from '@/lib/chart-format';
import { Maximize } from 'lucide-react';
import MediaModal, { type MediaSummary } from './MediaModal';

interface DynamicChartProps {
  config: any[];
  chartType: string;
  animateOnce?: boolean;
  fullView?: boolean;
}

const COLORS = [
  'var(--accent)',
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
];

const RADIAN = Math.PI / 180;

export default function DynamicChart({ config, chartType, animateOnce = true, fullView = true }: DynamicChartProps) {
  const keys = useMemo(() => {
    if (!config || config.length === 0) return [];
    return Object.keys(config[0]).filter(k => k !== 'name');
  }, [config]);

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const totalPieValue = useMemo(() => {
    if (chartType !== 'pie' || !config || !keys[0]) return 0;
    return config.reduce((acc, d) => acc + (Number(d[keys[0]]) || 0), 0);
  }, [config, chartType, keys]);

  const scrollMinWidth = useMemo(() => {
    if (chartType === 'pie') return '100%';
    const count = config?.length || 1;
    return Math.max(500, count * 95);
  }, [config, chartType]);

  const chartHeight = chartType === 'pie' ? (isMobile ? 370 : 360) : (isMobile ? 400 : 500);
  const formatValue = (value: unknown, key: string) => formatChartValue(value, key);
  const [isFullViewOpen, setIsFullViewOpen] = useState(false);

  const formatAxisTick = (val: unknown) => {
    const str = String(val ?? '');
    if (str.length > 20) {
      return str.slice(0, 18) + '…';
    }
    return str;
  };

  if (!config || config.length === 0) return null;

  const renderChart = () => {
    if (chartType === 'pie') {
      const pieData = config.map(d => ({
        name: d.name,
        value: Number(d[keys[0]]) || 0
      }));

      const pieHeight = isMobile ? 370 : 360;

      const renderCustomizedPieLabel = ({
        cx,
        cy,
        midAngle,
        innerRadius,
        outerRadius,
        percent
      }: any) => {
        if (!percent || percent < 0.05) return null;
        const radius = (innerRadius || 0) + (outerRadius - (innerRadius || 0)) * 0.6;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);

        return (
          <text
            x={x}
            y={y}
            fill="#ffffff"
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={isMobile ? 12 : 13}
            fontWeight={700}
            style={{
              filter: 'drop-shadow(0px 1px 2px rgba(0, 0, 0, 0.7))',
              pointerEvents: 'none'
            }}
          >
            {`${(percent * 100).toFixed(0)}%`}
          </text>
        );
      };

      return (
        <ResponsiveContainer width="100%" height={pieHeight}>
          <PieChart margin={{ top: 15, right: 15, bottom: 15, left: 15 }}>
            <Tooltip
              wrapperStyle={{ pointerEvents: 'none' }}
              formatter={(value, name) => [
                `${formatValue(value, String(name))}${totalPieValue > 0 ? ` (${((Number(value) / totalPieValue) * 100).toFixed(1)}%)` : ''}`,
                String(name)
              ]}
              contentStyle={{ 
                backgroundColor: 'rgba(23, 23, 23, .95)', 
                borderColor: 'var(--line)', 
                color: '#fff', 
                borderRadius: '8px', 
                padding: '8px 12px',
                fontSize: '12px' 
              }}
              itemStyle={{ color: '#fff' }}
            />
            <Legend 
              verticalAlign="bottom" 
              align="center"
              wrapperStyle={{ 
                color: 'var(--ink)', 
                fontSize: '12px', 
                paddingTop: '16px',
                lineHeight: '1.8' 
              }} 
              formatter={(value, entry: any) => {
                const val = Number(entry.payload?.value) || 0;
                const pct = totalPieValue > 0 ? ((val / totalPieValue) * 100).toFixed(0) : '';
                return (
                  <span className="inline-flex items-center gap-1.5 text-xs text-[var(--ink)]">
                    <span>{value}</span>
                    {pct && <span className="font-semibold opacity-75 text-[var(--muted)]">({pct}%)</span>}
                  </span>
                );
              }}
            />
            <Pie
              data={pieData}
              cx="50%"
              cy={isMobile ? "40%" : "44%"}
              labelLine={false}
              label={renderCustomizedPieLabel}
              outerRadius={isMobile ? 95 : 115}
              stroke="var(--surface)"
              strokeWidth={2}
              dataKey="value"
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === 'area') {
      return (
        <ResponsiveContainer width="100%" height={chartHeight} minWidth={scrollMinWidth}>
          <AreaChart data={config} margin={{ top: 20, right: 30, left: 15, bottom: isMobile ? 25 : 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
            <Legend verticalAlign="top" align="center" wrapperStyle={{ paddingBottom: '16px', color: 'var(--ink)', fontSize: '12px' }} />
            <XAxis 
              dataKey="name" 
              stroke="var(--muted)" 
              tick={{ fontSize: 11, fill: 'var(--muted)' }} 
              angle={-45} 
              textAnchor="end" 
              height={isMobile ? 80 : 90} 
              dx={-4} 
              dy={8}
              interval={0}
              tickFormatter={formatAxisTick}
            />
            <YAxis stroke="var(--muted)" tick={{ fill: 'var(--muted)', fontSize: 11 }} width={40} />
            <Tooltip
              wrapperStyle={{ pointerEvents: 'none' }}
              formatter={(value, name) => [formatValue(value, String(name)), String(name)]}
              contentStyle={{ backgroundColor: 'rgba(23, 23, 23, .95)', borderColor: 'var(--line)', color: '#fff', borderRadius: '8px', padding: '8px' }}
              itemStyle={{ color: '#fff', fontSize: '12px' }}
            />
            {keys.map((key, index) => {
              const color = COLORS[index % COLORS.length];
              return (
                <Area 
                  key={key} 
                  type="monotone" 
                  dataKey={key} 
                  stroke={color} 
                  strokeWidth={2}
                  fill={color} 
                  fillOpacity={0.85}
                />
              );
            })}
          </AreaChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === 'line') {
      return (
        <ResponsiveContainer width="100%" height={chartHeight} minWidth={scrollMinWidth}>
          <LineChart data={config} margin={{ top: 20, right: 30, left: 15, bottom: isMobile ? 25 : 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
            <Legend verticalAlign="top" align="center" wrapperStyle={{ paddingBottom: '16px', color: 'var(--ink)', fontSize: '12px' }} />
            <XAxis 
              dataKey="name" 
              stroke="var(--muted)" 
              tick={{ fontSize: 11, fill: 'var(--muted)' }} 
              angle={-45} 
              textAnchor="end" 
              height={isMobile ? 80 : 90} 
              dx={-4} 
              dy={8}
              interval={0}
              tickFormatter={formatAxisTick}
            />
            <YAxis stroke="var(--muted)" tick={{ fill: 'var(--muted)', fontSize: 11 }} width={40} />
            <Tooltip
              wrapperStyle={{ pointerEvents: 'none' }}
              formatter={(value, name) => [formatValue(value, String(name)), String(name)]}
              contentStyle={{ backgroundColor: 'rgba(23, 23, 23, .95)', borderColor: 'var(--line)', color: '#fff', borderRadius: '8px', padding: '8px' }}
              itemStyle={{ color: '#fff', fontSize: '12px' }}
            />
            {keys.map((key, index) => (
              <Line 
                key={key} 
                type="monotone" 
                dataKey={key} 
                stroke={COLORS[index % COLORS.length]} 
                strokeWidth={3}
                activeDot={{ r: 8 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === 'scatter') {
      return (
        <ResponsiveContainer width="100%" height={chartHeight} minWidth={scrollMinWidth}>
          <ScatterChart margin={{ top: 20, right: 30, left: 15, bottom: isMobile ? 25 : 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
            <Legend verticalAlign="top" align="center" wrapperStyle={{ paddingBottom: '16px', color: 'var(--ink)', fontSize: '12px' }} />
            <XAxis 
              dataKey="name" 
              type="category" 
              stroke="var(--muted)" 
              tick={{ fontSize: 11, fill: 'var(--muted)' }} 
              angle={-45} 
              textAnchor="end" 
              height={isMobile ? 80 : 90} 
              dx={-4} 
              dy={8}
              interval={0}
              tickFormatter={formatAxisTick}
            />
            <YAxis stroke="var(--muted)" tick={{ fill: 'var(--muted)', fontSize: 11 }} width={40} />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              wrapperStyle={{ pointerEvents: 'none' }}
              formatter={(value, name) => [formatValue(value, String(name)), String(name)]}
              contentStyle={{ backgroundColor: 'rgba(23, 23, 23, .95)', borderColor: 'var(--line)', color: '#fff', borderRadius: '8px', padding: '8px' }}
              itemStyle={{ color: '#fff', fontSize: '12px' }}
            />
            {keys.map((key, index) => (
              <Scatter 
                key={key} 
                name={key} 
                data={config} 
                fill={COLORS[index % COLORS.length]} 
              />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      );
    }

    const isStacked = chartType === 'stacked';
    const isHorizontal = chartType === 'horizontal-bar';

    return (
      <ResponsiveContainer width="100%" height={chartHeight} minWidth={scrollMinWidth}>
        <BarChart 
           data={config} 
           layout={isHorizontal ? "vertical" : "horizontal"}
           margin={{ 
             top: 20, 
             right: 30, 
             left: isHorizontal ? (isMobile ? 10 : 20) : 10, 
             bottom: isHorizontal ? 10 : (isMobile ? 25 : 20) 
           }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={!isHorizontal} horizontal={isHorizontal} />
          <Legend 
            verticalAlign="top" 
            align="center"
            wrapperStyle={{ paddingBottom: '16px', color: 'var(--ink)', fontSize: '12px' }} 
          />
          <XAxis 
            dataKey={isHorizontal ? undefined : "name"} 
            type={isHorizontal ? "number" : "category"}
            stroke="var(--muted)" 
            tick={{ fontSize: 11, fill: 'var(--muted)' }} 
            angle={isHorizontal ? 0 : -45}
            textAnchor={isHorizontal ? "middle" : "end"}
            height={isHorizontal ? 30 : (isMobile ? 80 : 90)}
            dx={isHorizontal ? 0 : -4}
            dy={isHorizontal ? 0 : 8}
            interval={0}
            tickFormatter={isHorizontal ? undefined : formatAxisTick}
          />
          <YAxis 
            dataKey={isHorizontal ? "name" : undefined}
            type={isHorizontal ? "category" : "number"}
            stroke="var(--muted)" 
            tick={{ fill: 'var(--muted)', fontSize: 11 }} 
            width={isHorizontal ? (isMobile ? 110 : 130) : 40}
            tickFormatter={(value) => {
              if (typeof value === 'string' && value.length > 15) {
                return value.substring(0, 13) + '…';
              }
              return String(value ?? '');
            }}
          />
          <Tooltip
            cursor={{ fill: 'var(--surface-2)' }}
            wrapperStyle={{ pointerEvents: 'none' }}
            formatter={(value, name) => [formatValue(value, String(name)), String(name)]}
            contentStyle={{ backgroundColor: 'rgba(23, 23, 23, .95)', borderColor: 'var(--line)', color: '#fff', borderRadius: '8px', padding: '8px' }}
            itemStyle={{ color: '#fff', fontSize: '12px' }}
          />
          {keys.map((key, index) => {
            const color = COLORS[index % COLORS.length];
            return (
              <Bar 
                key={key} 
                dataKey={key} 
                stackId={isStacked ? "a" : undefined}
                fill={color} 
                fillOpacity={0.85}
                stroke={color}
                strokeWidth={1.5}
                radius={isStacked ? [0, 0, 0, 0] : (isHorizontal ? [0, 4, 4, 0] : [4, 4, 0, 0])} 
                maxBarSize={50}
              >
                {isHorizontal && keys.length === 1 && (
                  <LabelList 
                    className="md:hidden" 
                    dataKey="name" 
                    fill="var(--ink)" 
                    offset={10} 
                    position="insideLeft" 
                    fontSize={11}
                    formatter={(v: any) => typeof v === 'string' && v.length > 15 ? v.substring(0, 13) + '…' : v}
                  />
                )}
              </Bar>
            );
          })}
        </BarChart>
      </ResponsiveContainer>
    );
  };

  const chartSummary: MediaSummary[] = keys.map((key, index) => ({
    label: key,
    color: COLORS[index % COLORS.length],
    value: (
      <div className="space-y-1">
        {config.map((row, rowIndex) => (
          <div key={`${key}-${rowIndex}`} className="flex justify-between gap-3">
            <span className="text-neutral-400">{String(row.name ?? `Row ${rowIndex + 1}`)}</span>
            <span>{formatValue(row[key], key)}</span>
          </div>
        ))}
      </div>
    ),
  }));

  return (
    <motion.div
      initial={animateOnce ? { opacity: 0, y: 30 } : false}
      whileInView={animateOnce ? { opacity: 1, y: 0 } : undefined}
      viewport={animateOnce ? { once: true, margin: "-50px" } : undefined}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="w-full my-8"
    >
      <div className="relative">
        {fullView && (
          <button
            type="button"
            onClick={() => setIsFullViewOpen(true)}
            aria-label="View chart full screen"
            className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--surface)]/90 text-[var(--ink)] shadow transition hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            <Maximize size={18} />
          </button>
        )}
        <div
        className={chartType !== 'pie' ? "chart-scroll-wrapper touch-pan-x touch-pan-y" : "w-full touch-pan-y"}
      >
        <div style={{ minWidth: chartType !== 'pie' ? scrollMinWidth : '100%' }}>
          {renderChart()}
        </div>
      </div>
      </div>
      <MediaModal
        open={isFullViewOpen}
        onClose={() => setIsFullViewOpen(false)}
        title="Chart full view"
        media={<div className="w-[min(70vw,900px)] max-w-full">{renderChart()}</div>}
        summary={chartSummary}
      />
    </motion.div>
  );
}
