import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, post } from '../../lib/api'
import type { DuplicateResult, Report, Status, StaffAction } from './types'

export const reportKeys = {
  all: ['reports'] as const,
  detail: (id: string) => ['reports', id] as const,
  duplicates: (id: string) => ['reports', id, 'duplicates'] as const,
}

export function useReports() {
  return useQuery({ queryKey: reportKeys.all, queryFn: () => api<Report[]>('/reports') })
}

export function useReport(id: string) {
  const client = useQueryClient()
  return useQuery({
    queryKey: reportKeys.detail(id),
    queryFn: () => api<Report>(`/reports/${id}`),
    // Show the list row immediately while the full history loads.
    placeholderData: () => client.getQueryData<Report[]>(reportKeys.all)?.find(report => report.id === id),
  })
}

export function useDuplicates(id: string, enabled: boolean) {
  return useQuery({
    queryKey: reportKeys.duplicates(id),
    queryFn: () => api<DuplicateResult>(`/reports/${id}/duplicates`),
    enabled,
  })
}

/** Invalidates every report query (lists, details, duplicates) after a successful write. */
function useReportMutation<Input, Output>(mutationFn: (input: Input) => Promise<Output>) {
  const client = useQueryClient()
  return useMutation({ mutationFn, onSuccess: () => client.invalidateQueries({ queryKey: reportKeys.all }) })
}

export const useSubmitReport = () => useReportMutation((form: FormData) => post<Report>('/reports', form))

export const useChangeStatus = (id: string) =>
  useReportMutation((body: { status: Status; verified_category?: string; note?: string }) =>
    post<Report>(`/reports/${id}/status`, body),
  )

export const useLogAction = (id: string) =>
  useReportMutation((body: { kind: StaffAction['kind']; note: string }) =>
    post<StaffAction>(`/reports/${id}/actions`, body),
  )

export function useGenerateDuplicates(id: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: () => post<DuplicateResult>(`/reports/${id}/duplicates/generate`),
    onSuccess: result => client.setQueryData(reportKeys.duplicates(id), result),
  })
}

export const useDecideDuplicate = () =>
  useReportMutation(({ id, decision, note }: { id: string; decision: 'confirmed' | 'rejected'; note?: string }) =>
    post(`/duplicates/${id}/decision`, { decision, ...(note ? { note } : {}) }),
  )
