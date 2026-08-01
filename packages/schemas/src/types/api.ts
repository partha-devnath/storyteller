export type ApiResponse<T = unknown> = {
  success: boolean
  data?: T
  error?: string
}

export type PaginatedResponse<T> = ApiResponse<T[]> & {
  total: number
  page: number
  pageSize: number
}
