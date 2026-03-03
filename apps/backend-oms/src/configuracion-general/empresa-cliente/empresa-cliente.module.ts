import { Module } from '@nestjs/common';
import { EmpresaClienteController } from './empresa-cliente.controller';
import { EmpresaClienteRepository } from './empresa-cliente.repository';
import { EmpresaClienteService } from './empresa-cliente.service';

@Module({
  controllers: [EmpresaClienteController],
  providers: [EmpresaClienteService, EmpresaClienteRepository],
  exports: [EmpresaClienteService],
})
export class EmpresaClienteModule {}
