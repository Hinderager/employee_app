'use client';

import { useMemo } from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { TrafficSource } from '../types/analytics';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

interface SourcesPieChartProps {
  data: TrafficSource[];
  loading?: boolean;
  height?: number;
  metric?: 'sessions' | 'users';
}

const colorPalette = [
  'rgba(59, 130, 246, 0.8)',   // Blue
  'rgba(16, 185, 129, 0.8)',   // Green
  'rgba(249, 115, 22, 0.8)',   // Orange
  'rgba(139, 92, 246, 0.8)',   // Purple
  'rgba(236, 72, 153, 0.8)',   // Pink
  'rgba(245, 158, 11, 0.8)',   // Amber
  'rgba(20, 184, 166, 0.8)',   // Teal
  'rgba(99, 102, 241, 0.8)',   // Indigo
];

const borderColors = [
  'rgb(59, 130, 246)',
  'rgb(16, 185, 129)',
  'rgb(249, 115, 22)',
  'rgb(139, 92, 246)',
  'rgb(236, 72, 153)',
  'rgb(245, 158, 11)',
  'rgb(20, 184, 166)',
  'rgb(99, 102, 241)',
];

export default function SourcesPieChart({
  data,
  loading = false,
  height = 300,
  metric = 'sessions',
}: SourcesPieChartProps) {
  const chartData = useMemo(() => {
    // Group by source and sort by metric value
    const sorted = [...data].sort((a, b) => b[metric] - a[metric]).slice(0, 8);

    const labels = sorted.map(d => {
      const source = d.source || '(direct)';
      const medium = d.medium || '(none)';
      return source === '(direct)' ? 'Direct' : `${source} / ${medium}`;
    });

    const values = sorted.map(d => d[metric]);

    return {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: colorPalette.slice(0, sorted.length),
          borderColor: borderColors.slice(0, sorted.length),
          borderWidth: 2,
          hoverOffset: 4,
        },
      ],
    };
  }, [data, metric]);

  const total = useMemo(() => {
    return data.reduce((sum, d) => sum + d[metric], 0);
  }, [data, metric]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '60%',
    plugins: {
      legend: {
        display: true,
        position: 'right' as const,
        labels: {
          usePointStyle: true,
          padding: 15,
          font: {
            size: 11,
          },
          generateLabels: function(chart: ChartJS) {
            const data = chart.data;
            if (data.labels && data.datasets.length) {
              return data.labels.map((label, i) => {
                const value = data.datasets[0].data[i] as number;
                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
                return {
                  text: `${label} (${percentage}%)`,
                  fillStyle: colorPalette[i],
                  strokeStyle: borderColors[i],
                  lineWidth: 2,
                  hidden: false,
                  index: i,
                  pointStyle: 'circle' as const,
                };
              });
            }
            return [];
          },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleFont: { size: 13 },
        bodyFont: { size: 12 },
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: function(context: unknown) {
            const ctx = context as { raw: number };
            const value = ctx.raw;
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
            return `${new Intl.NumberFormat('en-US').format(value)} ${metric} (${percentage}%)`;
          },
        },
      },
    },
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
          <div className="flex items-center justify-center">
            <div className="w-48 h-48 bg-gray-100 rounded-full"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Traffic Sources</h3>
        <div
          className="flex items-center justify-center bg-gray-50 rounded-lg"
          style={{ height }}
        >
          <p className="text-gray-500">No data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900">Traffic Sources</h3>
        <div className="text-xs text-gray-500">
          Total: {new Intl.NumberFormat('en-US').format(total)} {metric}
        </div>
      </div>
      <div style={{ height }}>
        <Doughnut data={chartData} options={options} />
      </div>
    </div>
  );
}
