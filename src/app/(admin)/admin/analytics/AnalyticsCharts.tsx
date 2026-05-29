'use client'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'

type GrowthRow = { mois: string; membres: number; dons: number; vues?: number; formations?: number }
type EngagementRow = { jour: string; lives: number; formations: number; podcast: number; prieres: number }
type PieRow = { name: string; value: number; color: string }

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { color: string; name: string; value: number }[]; label?: string }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl px-4 py-3 text-xs font-inter" style={{ background: 'rgba(8,0,20,0.95)', border: '1px solid rgba(255,255,255,0.1)' }}>
      <div className="font-bold text-white mb-2">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span style={{ color: 'rgba(255,255,255,0.6)' }}>{p.name}:</span>
          <span className="text-white font-semibold">{p.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  )
}

export function GrowthArea({ data }: { data: GrowthRow[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="gradMembres" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradDons" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey="mois" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <Area type="monotone" dataKey="membres" stroke="#D4AF37" strokeWidth={2} fill="url(#gradMembres)" name="Membres" />
        <Area type="monotone" dataKey="dons" stroke="#22C55E" strokeWidth={2} fill="url(#gradDons)" name="Revenus (€)" />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function EngagementPie({ data }: { data: PieRow[] }) {
  return (
    <ResponsiveContainer width="100%" height={160}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
          {data.map((entry, index) => (
            <Cell key={index} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip formatter={(value: number) => [`${value}%`, '']} />
      </PieChart>
    </ResponsiveContainer>
  )
}

export function EngagementBars({ data }: { data: EngagementRow[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey="jour" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="lives" fill="#EF4444" radius={[3, 3, 0, 0]} name="Lives" stackId="a" />
        <Bar dataKey="formations" fill="#8B5CF6" radius={[0, 0, 0, 0]} name="Formations" stackId="a" />
        <Bar dataKey="podcast" fill="#D4AF37" radius={[0, 0, 0, 0]} name="Podcast" stackId="a" />
        <Bar dataKey="prieres" fill="#EC4899" radius={[3, 3, 0, 0]} name="Prières" stackId="a" />
      </BarChart>
    </ResponsiveContainer>
  )
}
