'use client';

import { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { DailyMetric } from '../types/analytics';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface TrafficChartProps {
  data: DailyMetric[];
  loading?: boolean;
  height?: number;
  showLegend?: boolean;
  metrics?: ('pageViews' | 'sessions' | 'users' | 'conversions')[];
}

const metricConfig = {
  pageViews: {
    label: 'Page Views',
    borderColor: 'rgb(59, 130, 246)',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  sessions: {
    label: 'Sessions',
    borderColor: 'rgb(16, 185, 129)',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  users: {
    label: 'Users',
    borderColor: 'rgb(139, 92, 246)',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  conversions: {
    label: 'Conversions',
    borderColor: 'rgb(249, 115, 22)',
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
  },
};

export default function TrafficChart({
  data,
  loading = false,
  height = 300,
  showLegend = true,
  metrics = ['pageViews', 'sessions'],
}: TrafficChartProps) {
  const chartData = useMemo(() => {
    const sortedData = [...data].sort((a, b) => a.date.localeCompare(b.date));

    const labels = sortedData.map(d => {
      const date = new Date(d.date);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });

    const datasets = metrics.map(metric => ({
      label: metricConfig[metric].label,
      data: sortedData.map(d => d[metric]),
      borderColor: metricConfig[metric].borderColor,
      backgroundColor: metricConfig[metric].backgroundColor,
      fill: metrics.length === 1,
      tension: 0.3,
      pointRadius: 3,
      pointHoverRadius: 5,
    }));

    return { labels, datasets };
  }, [data, metrics]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        display: showLegend,
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleFont: { size: 13 },
        bodyFont: { size: 12 },
        padding: 12,
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 10,
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          callback: function(value: number | string) {
            return new Intl.NumberFormat('en-US', { notation: 'compact' }).format(Number(value));
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
          <div className="bg-gray-100 rounded" style={{ height }}></div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Traffic Trend</h3>
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
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Traffic Trend</h3>
      <div style={{ height }}>
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}
