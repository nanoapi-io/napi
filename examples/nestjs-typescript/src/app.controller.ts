import { Controller, Get, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService) {}

  // @nanoapi path:/api/v1 method:GET
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // @nanoapi path:/api/v1/liveness method:GET
  @Get('/liveness')
  getLiveness(): string {
    return 'OK';
  }

  // @nanoapi path:/api/v1/readiness method:GET
  @Get('/readiness')
  async getReadiness(@Res() res: Response): Promise<Response> {
    return res.status(HttpStatus.OK).json({ status: 'ok' });
  }
}
