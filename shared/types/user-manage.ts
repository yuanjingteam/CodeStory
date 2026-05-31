export interface UserDetail {
  id: string;
  email: string;
  role: number;
  nickname: string | null;
  avatar: string | null;
  sex: number | null;
  occupation: string | null;
  score: number;
  level: number;
  created_at: Date;
  updated_at: Date;
  is_delete: number;
}

export interface UpdateUserDetailRequest {
  id: string;
  email: string;
  role: number;
  nickname: string | null;
  avatar: string | null;
  sex: number;
  occupation: string | null;
  score: number;
}

export interface GetUserListRequest {
  page: number;
  pageSize: number;
  search: string;
  role: number | string;
  status: number | string;
}

export interface UserListResponse {
  pagination: PaginationResponse;
  list: UserDetail[];
}

export interface PaginationResponse {
  pageSize: number;
  currentPage: number;
  total: number;
  totalPages: number;
}
