import { SetMetadata } from "@nestjs/common";


export const RESPONSE_MSG_KEY = 'responseMsg';

export const ResponseMsg = (msg: string) => SetMetadata(RESPONSE_MSG_KEY, msg);
