import { Controller, Get, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService) {}

  // @nanoapi method:GET path:/api/v1
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('/liveness')
  getLiveness(): string {
    return 'OK';
  }

  @Get('/readiness')
  async getReadiness(@Res() res: Response): Promise<Response> {
    return res.status(HttpStatus.OK).json({ status: 'ok' });
  }
}
