import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthenticationRegistry, JwtBearerProvider, type JwtClaims } from '@nestjs/authentication';
import { User } from '../entities/user.entity';

/**
 * Verifies `Authorization: Bearer <token>` on protected routes
 * and loads the user the token was issued for.
 */
@Injectable()
export class JwtAuthProvider extends JwtBearerProvider<User> {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    registry: AuthenticationRegistry,
  ) {
    super();
    registry.registerProvider(this);
  }

  protected validate({ sub }: JwtClaims): Promise<User | null> | null {
    if (!sub) return null;

    // A deleted user's token stops working immediately.
    return this.users.findOne({ where: { id: sub, isDelete: 0 } });
  }
}
