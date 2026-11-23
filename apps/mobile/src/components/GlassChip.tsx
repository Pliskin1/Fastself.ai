import { GlassCard, type GlassCardProps } from './GlassCard';
import { radius } from '@/theme/tokens';

export function GlassChip({ radius: r = radius.chip, ...rest }: GlassCardProps) {
  return <GlassCard radius={r} {...rest} />;
}
