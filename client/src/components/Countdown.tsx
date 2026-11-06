import { useEffect, useState } from 'react';
import { useI18n } from '../i18n/LanguageContext';

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function getTimeLeft(target: number, now: number): TimeLeft | null {
  const diff = target - now;
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / DAY),
    hours: Math.floor((diff % DAY) / HOUR),
    minutes: Math.floor((diff % HOUR) / MINUTE),
    seconds: Math.floor((diff % MINUTE) / SECOND),
  };
}

interface CountdownProps {
  date: string;
}

export function Countdown({ date }: CountdownProps) {
  const { t } = useI18n();
  const target = new Date(date).getTime();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), SECOND);
    return () => window.clearInterval(id);
  }, []);

  const left = getTimeLeft(target, now);
  if (!left) return <p className="font-serif text-2xl text-burgundy">{t.eventStarted}</p>;

  const units: readonly [number, string][] = [
    [left.days, t.days],
    [left.hours, t.hours],
    [left.minutes, t.minutes],
    [left.seconds, t.seconds],
  ];

  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-3" role="timer" aria-live="off">
      {units.map(([value, label]) => (
        <div
          key={label}
          className="rounded-2xl border border-gold/50 bg-white/60 px-1 py-3 text-center shadow-sm"
        >
          <div className="font-serif text-3xl font-bold tabular-nums text-burgundy sm:text-4xl">
            {String(value).padStart(2, '0')}
          </div>
          <div className="mt-1 text-[11px] uppercase tracking-wider text-ink/60">{label}</div>
        </div>
      ))}
    </div>
  );
}
