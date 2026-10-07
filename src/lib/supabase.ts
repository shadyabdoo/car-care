import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

type VehicleType = 'car' | 'motorcycle';
type FuelType = 'gasoline_92' | 'gasoline_95' | 'gasoline_80' | 'diesel' | 'other';
type ServiceType =
  | 'oil_change'
  | 'inspection'
  | 'brake_service'
  | 'tire_service'
  | 'battery'
  | 'cooling_system'
  | 'ac_service'
  | 'electrical'
  | 'engine'
  | 'transmission'
  | 'suspension'
  | 'scheduled_service'
  | 'repair'
  | 'other';
type ExpenseCategory =
  | 'fuel'
  | 'maintenance'
  | 'service'
  | 'repair'
  | 'parts'
  | 'tires'
  | 'car_wash'
  | 'insurance'
  | 'registration'
  | 'fines'
  | 'parking'
  | 'tolls'
  | 'accessories'
  | 'other';
type PaymentMethod =
  | 'cash'
  | 'visa'
  | 'mastercard'
  | 'wallet'
  | 'bank_transfer'
  | 'other';
type TirePosition = 'front_left' | 'front_right' | 'rear_left' | 'rear_right' | 'spare';
type TireType = 'summer' | 'all_season' | 'winter' | 'performance' | 'other';
type DocumentType =
  | 'vehicle_registration'
  | 'insurance'
  | 'inspection'
  | 'driving_license'
  | 'warranty'
  | 'service_contract'
  | 'road_assistance'
  | 'other';

export type Database = {
  public: {
    Tables: {
      vehicles: {
        Row: {
          id: string;
          user_id: string;
          type: VehicleType;
          make: string;
          model: string;
          year: number;
          mileage: number;
          image_path: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: VehicleType;
          make: string;
          model: string;
          year: number;
          mileage?: number;
          image_path?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          type?: VehicleType;
          make?: string;
          model?: string;
          year?: number;
          mileage?: number;
          image_path?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      maintenance_records: {
        Row: {
          id: string;
          vehicle_id: string;
          user_id: string;
          service_type: string;
          description: string | null;
          service_date: string;
          mileage: number;
          cost: number | null;
          workshop: string | null;
          notes: string | null;
          next_service_date: string | null;
          next_service_mileage: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          vehicle_id: string;
          user_id: string;
          service_type: string;
          description?: string | null;
          service_date: string;
          mileage: number;
          cost?: number | null;
          workshop?: string | null;
          notes?: string | null;
          next_service_date?: string | null;
          next_service_mileage?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          service_type?: string;
          description?: string | null;
          service_date?: string;
          mileage?: number;
          cost?: number | null;
          workshop?: string | null;
          notes?: string | null;
          next_service_date?: string | null;
          next_service_mileage?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'maintenance_records_vehicle_id_user_id_fkey';
            columns: ['vehicle_id', 'user_id'];
            isOneToOne: false;
            referencedRelation: 'vehicles';
            referencedColumns: ['id', 'user_id'];
          },
        ];
      };
      fuel_records: {
        Row: {
          id: string;
          vehicle_id: string;
          user_id: string;
          date: string;
          odometer_km: number;
          liters: number;
          price_per_liter: number;
          total_cost: number;
          fuel_type: FuelType;
          station: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          vehicle_id: string;
          user_id: string;
          date: string;
          odometer_km: number;
          liters: number;
          price_per_liter: number;
          fuel_type: FuelType;
          station?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          date?: string;
          odometer_km?: number;
          liters?: number;
          price_per_liter?: number;
          fuel_type?: FuelType;
          station?: string | null;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'fuel_records_vehicle_owner_fkey';
            columns: ['vehicle_id', 'user_id'];
            isOneToOne: false;
            referencedRelation: 'vehicles';
            referencedColumns: ['id', 'user_id'];
          },
        ];
      };
      service_records: {
        Row: {
          id: string;
          vehicle_id: string;
          user_id: string;
          service_date: string;
          odometer_km: number;
          service_type: ServiceType;
          title: string;
          description: string | null;
          workshop: string | null;
          technician: string | null;
          parts_cost: number;
          labor_cost: number;
          total_cost: number;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          vehicle_id: string;
          user_id: string;
          service_date: string;
          odometer_km: number;
          service_type: ServiceType;
          title: string;
          description?: string | null;
          workshop?: string | null;
          technician?: string | null;
          parts_cost: number;
          labor_cost: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          service_date?: string;
          odometer_km?: number;
          service_type?: ServiceType;
          title?: string;
          description?: string | null;
          workshop?: string | null;
          technician?: string | null;
          parts_cost?: number;
          labor_cost?: number;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'service_records_vehicle_owner_fkey';
            columns: ['vehicle_id', 'user_id'];
            isOneToOne: false;
            referencedRelation: 'vehicles';
            referencedColumns: ['id', 'user_id'];
          },
        ];
      };
      expense_records: {
        Row: {
          id: string;
          vehicle_id: string;
          user_id: string;
          expense_date: string;
          category: ExpenseCategory;
          title: string;
          description: string | null;
          amount: number;
          odometer_km: number | null;
          vendor: string | null;
          payment_method: PaymentMethod | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          vehicle_id: string;
          user_id: string;
          expense_date: string;
          category: ExpenseCategory;
          title: string;
          description?: string | null;
          amount: number;
          odometer_km?: number | null;
          vendor?: string | null;
          payment_method?: PaymentMethod | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          expense_date?: string;
          category?: ExpenseCategory;
          title?: string;
          description?: string | null;
          amount?: number;
          odometer_km?: number | null;
          vendor?: string | null;
          payment_method?: PaymentMethod | null;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'expense_records_vehicle_owner_fkey';
            columns: ['vehicle_id', 'user_id'];
            isOneToOne: false;
            referencedRelation: 'vehicles';
            referencedColumns: ['id', 'user_id'];
          },
        ];
      };
      vehicle_documents: {
        Row: {
          id: string;
          vehicle_id: string;
          user_id: string;
          document_type: DocumentType;
          title: string;
          document_number: string | null;
          issue_date: string | null;
          expiry_date: string | null;
          provider: string | null;
          notes: string | null;
          file_path: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          vehicle_id: string;
          user_id: string;
          document_type: DocumentType;
          title: string;
          document_number?: string | null;
          issue_date?: string | null;
          expiry_date?: string | null;
          provider?: string | null;
          notes?: string | null;
          file_path?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          document_type?: DocumentType;
          title?: string;
          document_number?: string | null;
          issue_date?: string | null;
          expiry_date?: string | null;
          provider?: string | null;
          notes?: string | null;
          file_path?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'vehicle_documents_vehicle_owner_fkey';
            columns: ['vehicle_id', 'user_id'];
            isOneToOne: false;
            referencedRelation: 'vehicles';
            referencedColumns: ['id', 'user_id'];
          },
        ];
      };
      tire_records: {
        Row: {
          id: string;
          vehicle_id: string;
          user_id: string;
          position: TirePosition;
          brand: string;
          model: string;
          size: string;
          tire_type: TireType | null;
          purchase_date: string | null;
          installation_date: string | null;
          odometer_at_installation: number | null;
          current_odometer: number | null;
          expected_life_km: number | null;
          price: number | null;
          vendor: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          vehicle_id: string;
          user_id: string;
          position: TirePosition;
          brand: string;
          model: string;
          size: string;
          tire_type?: TireType | null;
          purchase_date?: string | null;
          installation_date?: string | null;
          odometer_at_installation?: number | null;
          current_odometer?: number | null;
          expected_life_km?: number | null;
          price?: number | null;
          vendor?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          position?: TirePosition;
          brand?: string;
          model?: string;
          size?: string;
          tire_type?: TireType | null;
          purchase_date?: string | null;
          installation_date?: string | null;
          odometer_at_installation?: number | null;
          current_odometer?: number | null;
          expected_life_km?: number | null;
          price?: number | null;
          vendor?: string | null;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'tire_records_vehicle_owner_fkey';
            columns: ['vehicle_id', 'user_id'];
            isOneToOne: false;
            referencedRelation: 'vehicles';
            referencedColumns: ['id', 'user_id'];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient<Database>(supabaseUrl, supabaseAnonKey, {
        auth: {
          storage: AsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      })
    : null;

export const isSupabaseConfigured = supabase !== null;

if (supabase && Platform.OS !== 'web') {
  if (AppState.currentState === 'active') {
    void supabase.auth.startAutoRefresh();
  }

  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      void supabase.auth.startAutoRefresh();
    } else {
      void supabase.auth.stopAutoRefresh();
    }
  });
}
