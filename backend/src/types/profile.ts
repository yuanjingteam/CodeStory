export interface UserProfileInfo {
    email: string;
    nickname: string;
    avatar: string;
    sex: number;
    occupation: string;
    role: number;
    level: number;
    score: number;
    created_at: string;
}

export interface UserCourse {
    id: string;
    cover_url: string;
    title: string;
    level: number;
    completed_lessons: number;
    total_lessons: number;
    status: number;
    last_learned_at: Date;
   }

export interface UpdateUserInfopRequest {
    nickname: string;
    avatar: string;
    sex: number;
    occupation: string;
}
