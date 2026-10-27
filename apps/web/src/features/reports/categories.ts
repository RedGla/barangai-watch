import type { Category, Status } from './types'

export const categories: { value: Category; label: string }[] = [
  { value: 'flooding', label: 'Flooding' },
  { value: 'fallen_trees', label: 'Fallen trees' },
  { value: 'broken_streetlights', label: 'Broken streetlights' },
  { value: 'exposed_wiring', label: 'Exposed wiring' },
  { value: 'potholes', label: 'Potholes' },
  { value: 'uncollected_garbage', label: 'Uncollected garbage' },
  { value: 'damaged_signage', label: 'Damaged signage' },
  { value: 'other', label: 'Other' },
]

export const statuses: Status[] = ['Pending', 'Under Verification', 'Accepted', 'In Progress', 'Resolved', 'Rejected']

export const label = (category?: Category | null) =>
  categories.find(item => item.value === category)?.label ?? 'Not set'
