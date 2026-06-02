'use client'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'

/**
 * Graphe de croissance (recharts) isolé pour être chargé en `dynamic()` —
 * recharts (~100 kB) reste hors du bundle principal des pages admin.
 */
export default function GrowthChart({ data }: { data: { mois: string; n: number }[] }) {
  return (
    <div style={{ width: '100%', height: 240 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="mois" tick={{ fill: 'rgba(245,243,238,0.4)', fontSize: 11 }} />
          <YAxis tick={{ fill: 'rgba(245,243,238,0.4)', fontSize: 11 }} allowDecimals={false} />
          <Tooltip contentStyle={{ background: '#14101f', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 12, color: '#F5F3EE' }} />
          <Line type="monotone" dataKey="n" stroke="#D4AF37" strokeWidth={2} dot={{ r: 3, fill: '#D4AF37' }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
