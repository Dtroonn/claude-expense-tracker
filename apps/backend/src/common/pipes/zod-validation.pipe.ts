import { BadRequestException, Injectable, type PipeTransform } from '@nestjs/common';
import { type ZodType, z } from 'zod';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodType) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value);

    if (!result.success) {
      throw new BadRequestException(z.treeifyError(result.error));
    }

    return result.data;
  }
}
