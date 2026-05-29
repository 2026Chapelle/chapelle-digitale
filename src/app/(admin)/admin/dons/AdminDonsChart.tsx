'use client'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

type Row = { mois: string; total: number; dimes: number; offrandes: number; partenaires: number }

export default function AdminDonsChart({ data }: { data: Row[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <defs>
          <linearGradient id="dimeGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#D4AF37" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#D4AF37" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="offGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#EC4899" stopOpacity={0.2} />
            <stop offset="100%" stopColor="#EC4899" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
        <XAxis dataKey="mois" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ background: '#0a0018', border: '1px solid rgba(212,175,55,0.2)', borderRadius: '12px', fontSize: '12px' }}
          labelStyle={{ color: '#D4AF37' }}
        />
        <Area type="monotone" dataKey="dimes" stroke="#D4AF37" strokeWidth={2} fill="url(#dimeGrad)" />
        <Area type="monotone" dataKey="offrandes" stroke="#EC4899" strokeWidth={2} fill="url(#offGrad)" />
        <Area type="monotone" dataKey="partenaires" stroke="#8B5CF6" strokeWidth={2} fill="none" />
      </AreaChart>
    </ResponsiveContainer>
  )
}
