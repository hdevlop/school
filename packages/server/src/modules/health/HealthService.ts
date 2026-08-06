import { Service } from '@server/najm';

@Service()
export class HealthService {
  private readonly message = 'Health service is working correctly';

  async getHealth() {
    return this.message;
  }

  async getStatus() {
    return this.message;
  }

  async ping() {
    return this.message;
  }
}
