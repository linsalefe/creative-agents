import { Card } from '@/components/ui/card';
import { AnimatedNumber } from './animated-number';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface KPICardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  color: string;
  bg: string;
  trend?: { value: string; up: boolean };
  index?: number;
}

export function KPICard({ label, value, icon: Icon, color, bg, trend, index = 0 }: KPICardProps) {
  return (
    <Card
      className="p-4 border border-border hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
        <div className={`h-8 w-8 rounded-lg ${bg} flex items-center justify-center`}>
          <Icon className={`h-4 w-4 ${color}`} strokeWidth={1.75} />
        </div>
      </div>
      <p className="text-[28px] font-bold text-foreground tabular-nums leading-tight">
        <AnimatedNumber value={value} />
      </p>
      {trend && (
        <div className="flex items-center gap-1 mt-2">
          <span
            className={`inline-flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded ${
              trend.up ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'
            }`}
          >
            {trend.up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {trend.value}
          </span>
        </div>
      )}
    </Card>
  );
}
