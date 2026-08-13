"use client";

/* eslint-disable react-doctor/prefer-dynamic-import */
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface RevenueChartProps {
  data: any[];
}

export default function RevenueChart({ data }: RevenueChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <XAxis dataKey="date" stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
        <Tooltip cursor={{ fill: '#F5F6F8' }} contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', boxShadow: '0 4px 16px -4px rgba(17, 24, 39, 0.08)' }} />
        <Bar dataKey="revenue" fill="var(--color-admin-accent)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
