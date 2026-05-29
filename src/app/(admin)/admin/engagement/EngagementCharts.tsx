'use client'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Cell,
} from 'recharts'

type RadarRow = { subject: string; A: number; fullMark: number }
type ActionRow = { action: string; valeur: number; color: string }

export function CommunityRadar({ data }: { data: RadarRow[] }) {
  return (
    <RadarChart cx={130} cy={130} outerRadius={90} width={260} height={260} data={data}>
      <PolarGrid stroke="rgba(255,255,255,0.06)" />
      <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11, fontFamily: 'Inter' }} />
      <PolarRadiusAxis tick={false} axisLine={false} />
      <Radar name="Communauté" dataKey="A" stroke="#D4AF37" fill="#D4AF37" fillOpacity={0.15} strokeWidth={2} />
    </RadarChart>
  )
}

export function ActionsBar({ data }: { data: ActionRow[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} barSize={28}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
        <XAxis dataKey="action" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ background: '#0a0018', border: '1px solid rgba(212,175,55,0.2)', borderRadius: '12px', fontSize: '12px' }}
          labelStyle={{ color: '#D4AF37' }}
        />
        <Bar dataKey="valeur" radius={[6, 6, 0, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
