import { Module } from '@nestjs/common';
import { AssignorsController } from './assignors.controller';
import { AssignorsService } from './assignors.service';

@Module({
  controllers: [AssignorsController],
  providers: [AssignorsService],
  exports: [AssignorsService],
})
export class AssignorsModule {}
