import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ZiApiClientService } from './client/zi-api-client.service';
import type {
  ZiCategoriaResponse,
  ZiChangeResponse,
  ZiPreciosResponse,
  ZiProductosResponse,
  ZiStockResponse,
} from './types/zi-api.types';

@Injectable()
export class CatalogoZiService {
  constructor(private readonly ziClient: ZiApiClientService) {}

  getChange(): Promise<ZiChangeResponse> {
    return this.ziClient.request<ZiChangeResponse>('GET', '/Change');
  }

  getProducts(product: string): Promise<ZiProductosResponse> {
    return this.ziClient.request<ZiProductosResponse>('POST', '/Products', {
      product,
    });
  }

  getPrices(product: string): Promise<ZiPreciosResponse> {
    return this.ziClient.request<ZiPreciosResponse>('POST', '/Prices', {
      product,
    });
  }

  getStock(product: string): Promise<ZiStockResponse> {
    return this.ziClient.request<ZiStockResponse>('POST', '/Stock', {
      product,
    });
  }

  async getCategory(id: string): Promise<ZiCategoriaResponse> {
    const payload = await this.ziClient.request<
      ZiCategoriaResponse | ZiCategoriaResponse[]
    >('GET', `/Categories/${id}`);

    // Bug ZI: /Categories/{id} puede responder objeto o array de 1 elemento.
    const normalized = Array.isArray(payload) ? payload[0] : payload;
    if (!normalized) {
      throw new ServiceUnavailableException('ZI devolvio respuesta invalida');
    }

    return normalized;
  }
}
