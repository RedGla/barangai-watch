export type Category =
  | 'flooding'
  | 'fallen_trees'
  | 'broken_streetlights'
  | 'exposed_wiring'
  | 'potholes'
  | 'uncollected_garbage'
  | 'damaged_signage'
  | 'other'
export type Hazard = 'electrical_hazard' | 'blocks_road' | 'risk_to_people'
export type Status = 'Pending' | 'Under Verification' | 'Accepted' | 'In Progress' | 'Resolved' | 'Rejected'
export type ReportEvent = { id?: string; to_status?: Status; created_at?: string; note?: string }
export type StaffAction = { id: string; kind: 'action' | 'coordination'; note: string; created_at: string }
export type Duplicate = {
  id: string
  candidate_report_id: string
  score: number
  decision: 'pending' | 'confirmed' | 'rejected'
}
export type DuplicateResult = {
  embedding_available: boolean
  suggestions: Duplicate[]
  manual_review_required: boolean
}
export type Report = {
  id: string
  status: Status
  resident_category: Category
  model_category?: Category | null
  verified_category?: Category | null
  description?: string | null
  latitude?: number
  longitude?: number
  location_label?: string | null
  hazards?: Hazard[]
  created_at?: string
  events?: ReportEvent[]
  actions?: StaffAction[]
}
export type Prediction = {
  prediction_available: boolean
  model_category: Category | null
  confidence: number | null
  suggested_description?: string | null
  // 'agreed' (both models), 'vision' (Cloudflare only), 'checker' (MobileCLIP only)
  category_source?: 'agreed' | 'vision' | 'checker' | null
  needs_check?: boolean
  // false when the vision model looked and saw nothing wrong
  problem_seen?: boolean
  hazards?: Hazard[]
}
