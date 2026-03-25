import { IsInt, Min } from 'class-validator';

export class SyncShopifyProductDto {
  /**
   * ID de la empresa OMS para la que se ejecuta el sync.
   * Obligatorio en todos los casos (incluso para admin global).
   * Usuarios con scope de empresa solo pueden sincronizar su propia empresa.
   */
  @IsInt()
  @Min(1)
  empresaId: number;
}
