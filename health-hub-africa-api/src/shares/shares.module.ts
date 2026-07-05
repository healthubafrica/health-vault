import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { StorageModule } from '../storage/storage.module';
import { SharesService } from './shares.service';
import { SharesController } from './shares.controller';
import { PublicShareController } from './public-share.controller';

@Module({
  imports: [PrismaModule, NotificationsModule, StorageModule],
  providers: [SharesService],
  controllers: [SharesController, PublicShareController],
})
export class SharesModule {}
