'use client';

import { useAuth } from '@/contexts/auth-context';

function getGreeting(): { text: string; emoji: string } {
  const h = new Date().getHours();
  if (h < 12) return { text: 'Bom dia', emoji: '☀️' };
  if (h < 18) return { text: 'Boa tarde', emoji: '🌤️' };
  return { text: 'Boa noite', emoji: '🌙' };
}

export function GreetingHeader() {
  const { user } = useAuth();
  const { text, emoji } = getGreeting();
  const firstName = user?.name.split(' ')[0] || '';
  const today = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-lg">{emoji}</span>
        <p className="text-sm text-muted-foreground">{text},</p>
      </div>
      <h1 className="text-[28px] font-bold text-foreground">{firstName}</h1>
      <p className="text-xs text-muted-foreground mt-0.5 capitalize">{today}</p>
    </div>
  );
}
