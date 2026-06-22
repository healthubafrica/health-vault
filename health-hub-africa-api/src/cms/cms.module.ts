import { Module } from '@nestjs/common';
import { CmsService } from './cms.service';
import { CmsPublicController, CmsAdminController } from './cms.controller';

@Module({
  providers: [CmsService],
  controllers: [CmsPublicController, CmsAdminController],
})
export class CmsModule {}
