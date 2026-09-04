"use client";

/* eslint-disable react-doctor/prefer-dynamic-import */
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface RevenueChartProps {
  data: { date: string; revenue: number; invoiceCount?: number }[];
}

export default function RevenueChart({ data }: RevenueChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
        <XAxis 
          dataKey="date" 
          stroke="#94A3B8" 
          fontSize={12} 
          tickLine={false} 
          axisLine={false} 
          dy={6}
        />
        <YAxis 
          stroke="#94A3B8" 
          fontSize={12} 
          tickLine={false} 
          axisLine={false}
          tickFormatter={(val) => {
            if (val >= 100000) return `₹${(val / 100000).toFixed(val % 100000 === 0 ? 0 : 1)}L`;
            if (val >= 1000) return `₹${Math.round(val / 1000)}k`;
            return `₹${val}`;
          }}
        />
        <Tooltip 
          cursor={{ fill: '#F1F5F9' }} 
          contentStyle={{ 
            borderRadius: '10px', 
            border: '1px solid #E2E8F0', 
            boxShadow: '0 4px 16px -4px rgba(15, 23, 42, 0.08)',
            backgroundColor: '#FFFFFF',
            padding: '8px 12px',
          }}
          formatter={(value: any, _name: any, item: any) => [
            `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${item.payload.invoiceCount ? ` (${item.payload.invoiceCount} ${item.payload.invoiceCount === 1 ? 'bill' : 'bills'})` : ''}`,
            'Revenue'
          ]}
          labelFormatter={(label) => `Date: ${label}`}
        />
        <Bar 
          dataKey="revenue" 
          fill="var(--color-admin-accent)" 
          radius={[4, 4, 0, 0]} 
          maxBarSize={48}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
