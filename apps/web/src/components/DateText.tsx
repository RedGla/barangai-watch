import { useLanguage } from '../lib/i18n'

const FORMAT: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
}

/** Philippine day-month order ("26 Oct 2026, 9:13 PM"), in the interface language. Compact drops this year's year. */
export function DateText({ value, compact = false }: { value: string; compact?: boolean }) {
  const { language } = useLanguage()
  const date = new Date(value)
  const options = compact && date.getFullYear() === new Date().getFullYear() ? { ...FORMAT, year: undefined } : FORMAT
  return (
    <time dateTime={date.toISOString()}>
      {new Intl.DateTimeFormat(language === 'fil' ? 'fil-PH' : 'en-GB', options).format(date)}
    </time>
  )
}
