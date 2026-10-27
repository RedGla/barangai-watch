import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router'
import { m } from 'motion/react'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { ArrowRight, CircleCheckBig, Inbox, Layers, Wrench } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DateText } from '@/components/DateText'
import { EmptyState } from '@/components/page'
import { Txt, useLanguage, useText } from '../../lib/i18n'
import { categories, label } from '../reports/categories'
import { CategoryTile } from '../reports/CategoryIcon'
import { useReports } from '../reports/queries'
import { StatusBadge } from '../reports/StatusBadge'
import type { Report } from '../reports/types'
import { MapLegend, StaffMap } from './StaffMap'

const DAYS = 14
const chartConfig = { count: { label: 'Reports', color: 'var(--chart-1)' } } satisfies ChartConfig

function Kpi({
  label: title,
  value,
  icon: Icon,
  color,
  to,
  index,
}: {
  label: string
  value: number
  icon: typeof Inbox
  color: string
  to: string
  index: number
}) {
  return (
    <m.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link
        to={to}
        className="group hairline block rounded-2xl bg-card p-5 transition-shadow hover:shadow-[0_6px_24px_-10px_rgb(0_0_0/0.2)]"
      >
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-medium text-muted-foreground">
            <Txt>{title}</Txt>
          </span>
          <span
            className="grid size-8 place-items-center rounded-lg"
            style={{ color, backgroundColor: `color-mix(in oklab, ${color} 13%, transparent)` }}
          >
            <Icon className="size-4" aria-hidden="true" />
          </span>
        </div>
        <strong className="mt-4 block text-[34px] leading-none font-bold tracking-tight tabular-nums">{value}</strong>
      </Link>
    </m.div>
  )
}

export function OverviewPage() {
  const t = useText()
  const navigate = useNavigate()
  const { language } = useLanguage()
  const reports = useReports()
  const all = useMemo(() => reports.data ?? [], [reports.data])
  const count = (...statuses: Report['status'][]) => all.filter(report => statuses.includes(report.status)).length
  const trend = useMemo(
    () =>
      Array.from({ length: DAYS }, (_, index) => {
        const day = new Date()
        day.setHours(0, 0, 0, 0)
        day.setDate(day.getDate() - (DAYS - 1 - index))
        return {
          day: day.toLocaleDateString(language === 'fil' ? 'fil-PH' : 'en-GB', { day: 'numeric', month: 'short' }),
          count: all.filter(
            report => report.created_at && new Date(report.created_at).toDateString() === day.toDateString(),
          ).length,
        }
      }),
    [all, language],
  )
  const byCategory = categories
    .map(item => ({ ...item, count: all.filter(report => report.resident_category === item.value).length }))
    .sort((a, b) => b.count - a.count)
  const maxCategory = Math.max(1, ...byCategory.map(item => item.count))
  const attention = all
    .filter(report => ['Pending', 'Under Verification'].includes(report.status))
    .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
    .slice(0, 6)
  const today = new Intl.DateTimeFormat(language === 'fil' ? 'fil-PH' : 'en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date())
  return (
    <div className="mx-auto max-w-[1400px] space-y-8 p-5 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[13px] font-medium text-muted-foreground">{today}</p>
          <h1 className="text-[28px] leading-tight font-bold">
            <Txt>Operations overview</Txt>
          </h1>
        </div>
      </div>
      {reports.error && (
        <p role="alert" className="text-[14px] text-destructive">
          <Txt>{reports.error.message}</Txt>
        </p>
      )}

      <div className="grid grid-cols-2 gap-5 xl:grid-cols-4">
        <Kpi
          index={0}
          label="Waiting for review"
          value={count('Pending', 'Under Verification')}
          icon={Inbox}
          color="var(--status-pending)"
          to="/desk/reports?status=Pending"
        />
        <Kpi
          index={1}
          label="Being worked on"
          value={count('Accepted', 'In Progress')}
          icon={Wrench}
          color="var(--status-progress)"
          to="/desk/reports?status=In+Progress"
        />
        <Kpi
          index={2}
          label="Resolved"
          value={count('Resolved')}
          icon={CircleCheckBig}
          color="var(--status-resolved)"
          to="/desk/reports?status=Resolved"
        />
        <Kpi
          index={3}
          label="Total reports"
          value={all.length}
          icon={Layers}
          color="var(--primary)"
          to="/desk/reports"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>
              <Txt>New reports</Txt> <span className="font-normal text-muted-foreground">· {t('Last 14 days')}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="aspect-auto h-56 w-full">
              <AreaChart data={trend} margin={{ left: -20, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-count)" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="var(--color-count)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} interval="preserveStartEnd" />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={40} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
                <Area
                  dataKey="count"
                  name={t('Reports')}
                  type="monotone"
                  stroke="var(--color-count)"
                  strokeWidth={2}
                  fill="url(#trend-fill)"
                  animationDuration={500}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>
              <Txt>Category distribution</Txt>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3.5">
              {byCategory.map(item => (
                <li key={item.value} className="flex items-center gap-2.5 text-[13.5px]">
                  <CategoryTile category={item.value} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="flex justify-between gap-2">
                      <span className="truncate">
                        <Txt>{item.label}</Txt>
                      </span>
                      <strong className="font-semibold tabular-nums">{item.count}</strong>
                    </span>
                    <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-muted">
                      <m.span
                        className="block h-full origin-left rounded-full bg-primary"
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: item.count / maxCategory }}
                        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                      />
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>
              <Txt>Needs attention</Txt>
            </CardTitle>
            <CardAction>
              <Button asChild variant="ghost" size="sm">
                <Link to="/desk/reports">
                  <Txt>View all</Txt> <ArrowRight />
                </Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {attention.length === 0 ? (
              <EmptyState pose="clipboard" title={t('All caught up')} body={t('No reports are waiting for review.')} />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Txt>Incident category</Txt>
                    </TableHead>
                    <TableHead>
                      <Txt>Status</Txt>
                    </TableHead>
                    <TableHead className="text-right">
                      <Txt>Submitted</Txt>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attention.map(report => (
                    <TableRow
                      key={report.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/desk/reports/${report.id}`)}
                    >
                      <TableCell>
                        <Link
                          to={`/desk/reports/${report.id}`}
                          className="flex items-center gap-2.5 font-medium"
                          onClick={event => event.stopPropagation()}
                        >
                          <CategoryTile category={report.resident_category} size="sm" />
                          <span>
                            <Txt>{label(report.resident_category)}</Txt>
                            <span className="block font-mono text-[12px] font-normal text-muted-foreground">
                              #{report.id.slice(0, 8).toUpperCase()}
                            </span>
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={report.status} />
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {report.created_at && <DateText value={report.created_at} />}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        <Card className="overflow-hidden pb-0">
          <CardHeader>
            <CardTitle>
              <Txt>Incident map</Txt>
            </CardTitle>
            <CardAction>
              <Button asChild variant="ghost" size="sm">
                <Link to="/desk/map">
                  <Txt>Open map</Txt> <ArrowRight />
                </Link>
              </Button>
            </CardAction>
            <MapLegend className="col-span-2 mt-1" />
          </CardHeader>
          <StaffMap reports={all} className="min-h-72" onSelect={report => navigate(`/desk/reports/${report.id}`)} />
        </Card>
      </div>
    </div>
  )
}
