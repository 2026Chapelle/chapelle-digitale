'use client'
import { PieChart, Pie, Cell } from 'recharts'

type PlatformRow = { name: string; value: number; color: string }

export default function PlatformsChart({ data }: { data: PlatformRow[] }) {
  return (
    <PieChart width={180} height={180}>
      <Pie data={data} cx={90} cy={90} innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
        {data.map((entry, i) => (
          <Cell key={i} fill={entry.color} />
        ))}
      </Pie>
    </PieChart>
  )
}
