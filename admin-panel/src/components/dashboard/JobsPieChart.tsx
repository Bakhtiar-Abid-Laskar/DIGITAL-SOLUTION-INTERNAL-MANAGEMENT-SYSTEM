"use client";

/* eslint-disable react-doctor/prefer-dynamic-import */
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

interface JobsPieChartProps {
  data: { name: string, value: number, color: string }[];
}

export default function JobsPieChart({ data }: JobsPieChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={80}
          paddingAngle={5}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip 
          contentStyle={{ borderRadius: '8px', border: '1px solid var(--color-admin-border)', backgroundColor: 'var(--color-admin-bg-surface)', boxShadow: 'var(--shadow-card)', color: 'var(--color-admin-text-primary)' }} 
          itemStyle={{ color: 'var(--color-admin-text-primary)' }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
