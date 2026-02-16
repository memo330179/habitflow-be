import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './common/decorators/public.decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  getRoot() {
    return this.appService.getWelcome();
  }

  @Public()
  @Get('health')
  async getHealth() {
    return this.appService.checkHealth();
  }
}
