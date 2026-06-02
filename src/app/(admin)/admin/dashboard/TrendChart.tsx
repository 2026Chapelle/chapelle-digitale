'use client'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import type { TrendPoint } from '@/lib/admin-analytics'

/**
 * Courbe de tendance Visiteurs vs Inscriptions sur la période sélectionnée.
 */
export default function TrendChart({ data }: { data: TrendPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="visGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#D4AF37" stopOpacity={0.32} />
            <stop offset="100%" stopColor="#D4AF37" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="insGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.28} />
            <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
        <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ background: '#0a0018', border: '1px solid rgba(212,175,55,0.2)', borderRadius: '12px', fontSize: '12px' }}
          labelStyle={{ color: '#D4AF37', fontFamily: 'Cinzel, serif' }}
        />
        <Legend wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }} />
        <Area type="monotone" name="Visiteurs" dataKey="visiteurs" stroke="#D4AF37" strokeWidth={2} fill="url(#visGrad)" />
        <Area type="monotone" name="Inscriptions" dataKey="inscriptions" stroke="#8B5CF6" strokeWidth={2} fill="url(#insGrad)" />
      </AreaChart>
    </ResponsiveContainer>
  )
}
