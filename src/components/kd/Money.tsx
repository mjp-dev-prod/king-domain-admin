import { cn } from '@/lib/utils'

/** Gold is for money only. An amount is gold, with figures that line up. */
export function Money({ amount, currency = 'NGN', className }: { amount: number | string; currency?: string; className?: string }) {
  const n = typeof amount === 'string' ? Number(amount) : amount
  const symbol = currency === 'USD' ? '$' : '₦'
  const text = Number.isFinite(n) ? n.toLocaleString('en-NG', { maximumFractionDigits: 2 }) : String(amount)
  return (
    <span className={cn('tabular font-semibold text-money', className)}>
      {symbol}
      {text}
    </span>
  )
}
