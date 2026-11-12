import { AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react';
import type { ReactNode } from 'react';

type BannerTone = 'info' | 'warning' | 'error' | 'success';

interface StatusBannerProps {
  tone: BannerTone;
  title?: string;
  children: ReactNode;
  action?: ReactNode;
}

const TONE_STYLES: Record<
  BannerTone,
  { container: string; iconColor: string; Icon: typeof Info }
> = {
  info: {
    container: 'bg-[var(--status-info-bg)] border-[#BFDBFE] text-[#1E3A8A]',
    iconColor: 'text-[var(--status-info)]',
    Icon: Info,
  },
  warning: {
    container: 'bg-[var(--status-uncertain-bg)] border-[#FDE68A] text-[#78350F]',
    iconColor: 'text-[var(--status-uncertain)]',
    Icon: AlertTriangle,
  },
  error: {
    container: 'bg-[var(--status-miss-bg)] border-[#FECACA] text-[#7F1D1D]',
    iconColor: 'text-[var(--status-miss)]',
    Icon: AlertCircle,
  },
  success: {
    container: 'bg-[var(--status-match-bg)] border-[#BBF7D0] text-[#14532D]',
    iconColor: 'text-[var(--status-match)]',
    Icon: CheckCircle2,
  },
};

export function StatusBanner({
  tone,
  title,
  children,
  action,
}: StatusBannerProps) {
  const { container, iconColor, Icon } = TONE_STYLES[tone];

  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`rounded-[10px] border px-4 py-3 text-sm leading-relaxed ${container}`}
    >
      <div className="flex items-start gap-3">
        <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${iconColor}`} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          {title && <p className="font-semibold">{title}</p>}
          <div className={title ? 'mt-0.5' : undefined}>{children}</div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
}

