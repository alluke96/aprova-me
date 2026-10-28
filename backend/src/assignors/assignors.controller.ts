import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UuidParam } from '../common/validation/uuid-param';
import { AssignorsService } from './assignors.service';
import { CreateAssignorDto, ListAssignorsQueryDto, UpdateAssignorDto } from './dto/assignor.dto';

@ApiTags('Cedentes')
@ApiBearerAuth()
@Controller('integrations/assignor')
export class AssignorsController {
  constructor(private readonly assignors: AssignorsService) {}

  @Post()
  create(@Body() dto: CreateAssignorDto) {
    return this.assignors.create(dto);
  }

  @Get()
  findAll(@Query() query: ListAssignorsQueryDto) {
    return this.assignors.findAll(query);
  }

  @Get(':id')
  findOne(@UuidParam() id: string) {
    return this.assignors.findOne(id);
  }

  @Patch(':id')
  update(@UuidParam() id: string, @Body() dto: UpdateAssignorDto) {
    return this.assignors.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@UuidParam() id: string) {
    return this.assignors.remove(id);
  }
}
