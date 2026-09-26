export interface User {
  id: number;
  username: string;
  fullName?: string | null;
  isAdmin: boolean;
  createdAt?: string | null;
}
