import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Response } from 'express';
import { map, Observable } from 'rxjs';
import { RESPONSE_MSG_KEY } from '../decorators/response-msg/response-msg.decorator';

@Injectable()
export class ResponseFormaterInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const statusCode = context.switchToHttp().getResponse<Response>().statusCode;
    const responseMsg = this.reflector.getAllAndOverride<string>(RESPONSE_MSG_KEY, [
      context.getHandler(),
      context.getClass()
    ]) ?? 'Success';
    return next.handle().pipe(map((data) => {
      return {
        statusCode,
        data,
        message: responseMsg
      }
    }));
  }
}
