// frontend/src/services/admin.service.ts

import { api } from '@/services/api.client';
  
// ============================================================================
// INTERFACES
// ============================================================================

export interface DemoPredictionComparison {
  userId: string;
  predictedBasket: Product[]; // A simple list of predicted products
  groundTruthBasket: Product[]; // A simple list of the actual products
}

class AdminService {
  // ============================================================================
  // DEMO FUNCTIONALITY
  // ============================================================================

  /**
   * DEMAND 3: Get live demo prediction comparison
   * FIXED: Now accepts ANY user ID - no client-side validation
   */
  async getUserPredictionComparison(userId: string): Promise<DemoUserPrediction> {
    return api.get<DemoUserPrediction>(`/admin/demo/user-prediction/${userId}`);
  }

  /**
   * DEMAND 1: Seed a new demo user into the database
   * FIXED: Now accepts ANY Instacart user ID - no client-side validation
   */
  async seedDemoUser(instacartUserId: string): Promise<any> {
    return api.post(`/admin/demo/seed-user/${instacartUserId}`);
  }
}

export const adminService = new AdminService();
export default adminService;