export interface AuthUser {
  userId: string;
  email?: string;
  displayName?: string;
  pictureUrl?: string;
  publicNickname?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthMeResponse {
  authenticated: boolean;
  userId?: string;
  email?: string;
  displayName?: string;
  pictureUrl?: string;
  publicNickname?: string;
}

export interface AuthNicknameClaimInput {
  nickname: string;
}

export interface AuthMergeInput {
  sessions: unknown[];
}
