import { useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { NativeSelect } from '@/components/ui/native-select'
import { useText } from '../../lib/i18n'
import { statuses } from '../reports/categories'
import { useReports } from '../reports/queries'
import { MapLegend, StaffMap } from './StaffMap'

export function MapPage() {
  const t = useText()
  const navigate = useNavigate()
  const reports = useReports()
  const [params, setParams] = useSearchParams()
  const status = params.get('status') ?? ''
  const all = reports.data
  const visible = useMemo(() => (all ?? []).filter(report => !status || report.status === status), [all, status])
  return (
    <div className="relative h-[calc(100svh-3.5rem)] md:h-[calc(100svh-3.5rem-1rem)]">
      <StaffMap
        reports={visible}
        className="absolute inset-0 md:rounded-b-xl"
        onSelect={report => navigate(`/desk/reports/${report.id}`)}
      />
      <div className="glass hairline absolute top-3 right-3 z-[500] w-64 space-y-2.5 rounded-2xl p-3 shadow-lg">
        <label className="block">
          <span className="sr-only">{t('Filter by status')}</span>
          <NativeSelect
            aria-label={t('Filter by status')}
            value={status}
            onChange={event => setParams(event.target.value ? { status: event.target.value } : {}, { replace: true })}
          >
            <option value="">{t('All statuses')}</option>
            {statuses.map(item => (
              <option key={item} value={item}>
                {t(item)}
              </option>
            ))}
          </NativeSelect>
        </label>
        <p className="text-[12.5px] text-muted-foreground">
          {visible.length} {t('of')} {all?.length ?? 0} {t('reports')} · {t('Click a pin to open it.')}
        </p>
        <MapLegend />
      </div>
    </div>
  )
}
