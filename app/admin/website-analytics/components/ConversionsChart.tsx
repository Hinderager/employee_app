'use client';

import { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface ConversionsData {
  label: string;
  ga4Conversions?: number;
  metaConversions?: number;
  googleAdsConversions?: number;
}

interface ConversionsChartProps {
  data: ConversionsData[];
  loading?: boolean;
  height?: number;
  showLegend?: boolean;
}

export default function ConversionsChart({
  data,
  loading = false,
  height = 300,
  showLegend = true,
}: ConversionsChartProps) {
  const chartData = useMemo(() => {
    const labels = data.map(d => d.label);

    const datasets = [];

    // Check which data sources have values
    const hasGA4 = data.some(d => d.ga4Conversions && d.ga4Conversions > 0);
    const hasMeta = data.some(d => d.metaConversions && d.metaConversions > 0);
    const hasGoogleAds = data.some(d => d.googleAdsConversions && d.googleAdsConversions > 0);

    if (hasGA4) {
      datasets.push({
        label: 'GA4',
        data: data.map(d => d.ga4Conversions || 0),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1,
        borderRadius: 4,
      });
    }

    if (hasMeta) {
      datasets.push({
        label: 'Meta',
        data: data.map(d => d.metaConversions || 0),
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1,
        borderRadius: 4,
      });
    }

    if (hasGoogleAds) {
      datasets.push({
        label: 'Google Ads',
        data: data.map(d => d.googleAdsConversions || 0),
        backgroundColor: 'rgba(16, 185, 129, 0.8)',
        borderColor: 'rgb(16, 185, 129)',
        borderWidth: 1,
        borderRadius: 4,
      });
    }

    // If no specific source data, show generic conversions
    if (datasets.length === 0) {
      datasets.push({
        label: 'Conversions',
        data: data.map(d => (d.ga4Conversions || 0) + (d.metaConversions || 0) + (d.googleAdsConversions || 0)),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1,
        borderRadius: 4,
      });
    }

    return { labels, datasets };
  }, [data]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: showLegend && chartData.datasets.length > 1,
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
          maxRotation: 45,
          minRotation: 0,
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          stepSize: 1,
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
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Conversions by Site</h3>
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
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Conversions by Site</h3>
      <div style={{ height }}>
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
}
