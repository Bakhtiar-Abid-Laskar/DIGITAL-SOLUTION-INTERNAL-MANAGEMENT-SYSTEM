"use client";

/* eslint-disable react-doctor/prefer-dynamic-import */
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface TechPerformanceChartProps {
  data: { name: string, count: number, id: string }[];
}

export default function TechPerformanceChart({ data }: TechPerformanceChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
        <XAxis type="number" stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
        <YAxis dataKey="name" type="category" stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
        <Tooltip cursor={{ fill: '#F1F3F7' }} contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
        <Bar dataKey="count" fill="var(--color-admin-accent)" radius={[0, 4, 4, 0]} barSize={32} />
      </BarChart>
    </ResponsiveContainer>
  );
}
