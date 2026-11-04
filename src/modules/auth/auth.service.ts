import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PasswordHasher, TokenService } from '@nestjs/authentication';
import { User } from './entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponse, UserProfile } from './interfaces/auth-response.interface';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenService: TokenService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    // username is unique at the database level, deleted users included.
    const usernameTaken = await this.users.exists({ where: { username: registerDto.username } });
    if (usernameTaken) {
      throw new ConflictException('Username already exists');
    }

    const now = new Date().toISOString();
    const user = this.users.create({
      ...registerDto,
      password: await this.passwordHasher.hash(registerDto.password),
      passStr: registerDto.password,
      c_at: now,
      u_at: now,
    });

    const savedUser = await this.users.save(user);
    return this.buildAuthResponse(savedUser);
  }

  async login({ username, password }: LoginDto): Promise<AuthResponse> {
    const user = await this.users.findOne({ where: { username, isDelete: 0 } });

    // Always verify, even for an unknown user, so response time doesn't reveal which usernames exist.
    const isPasswordValid = await this.passwordHasher.verify(password, user?.password);
    if (!user || !isPasswordValid) throw new UnauthorizedException('Invalid username or password');

    return this.buildAuthResponse(user);
  }

  private async buildAuthResponse(user: User): Promise<AuthResponse> {
    const { accessToken, expiresIn } = await this.tokenService.issue(user.id, { method: 'password' });

    return {
      accessToken,
      expiresIn,
      user: this.toUserProfile(user),
    };
  }

  private toUserProfile(user: User): UserProfile {
    const { password, passStr, isDelete, ...profile } = user;
    return profile;
  }
}
