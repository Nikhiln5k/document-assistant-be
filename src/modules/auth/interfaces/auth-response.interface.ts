import { User } from '../entities/user.entity';

export type UserProfile = Omit<User, 'password' | 'passStr' | 'isDelete'>;

export interface AuthResponse {
  accessToken: string;
  expiresIn: number;
  user: UserProfile;
}
