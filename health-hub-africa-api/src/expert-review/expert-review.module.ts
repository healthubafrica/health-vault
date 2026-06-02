import { Module } from '@nestjs/common';
import { ExpertReviewService } from './expert-review.service';
import { ExpertReviewController } from './expert-review.controller';

@Module({
  providers: [ExpertReviewService],
  controllers: [ExpertReviewController],
  exports: [ExpertReviewService],
})
export class ExpertReviewModule {}
