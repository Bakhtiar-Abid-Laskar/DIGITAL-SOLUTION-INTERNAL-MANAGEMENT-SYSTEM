export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      attendance: {
        Row: {
          approved_by: string | null
          at_location: boolean | null
          check_in_drive_file_id: string | null
          check_in_time: string | null
          check_out_drive_file_id: string | null
          check_out_gps_lat: number | null
          check_out_gps_lng: number | null
          check_out_time: string | null
          date: string
          early_hours: number | null
          early_in_minutes: number | null
          gps_lat: number | null
          gps_lng: number | null
          id: string
          late_in_minutes: number | null
          late_out_minutes: number | null
          low_accuracy: boolean | null
          ot_hours: number | null
          review_status: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          approved_by?: string | null
          at_location?: boolean | null
          check_in_drive_file_id?: string | null
          check_in_time?: string | null
          check_out_drive_file_id?: string | null
          check_out_gps_lat?: number | null
          check_out_gps_lng?: number | null
          check_out_time?: string | null
          date: string
          early_hours?: number | null
          early_in_minutes?: number | null
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          late_in_minutes?: number | null
          late_out_minutes?: number | null
          low_accuracy?: boolean | null
          ot_hours?: number | null
          review_status?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          approved_by?: string | null
          at_location?: boolean | null
          check_in_drive_file_id?: string | null
          check_in_time?: string | null
          check_out_drive_file_id?: string | null
          check_out_gps_lat?: number | null
          check_out_gps_lng?: number | null
          check_out_time?: string | null
          date?: string
          early_hours?: number | null
          early_in_minutes?: number | null
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          late_in_minutes?: number | null
          late_out_minutes?: number | null
          low_accuracy?: boolean | null
          ot_hours?: number | null
          review_status?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_legacy: {
        Row: {
          created_at: string | null
          discount: number | null
          grand_total: number | null
          id: string
          invoice_url: string | null
          is_paid: boolean | null
          job_id: string | null
          labour_charge: number | null
          parts_total: number | null
          payment_mode: string | null
          tax_percent: number | null
        }
        Insert: {
          created_at?: string | null
          discount?: number | null
          grand_total?: number | null
          id?: string
          invoice_url?: string | null
          is_paid?: boolean | null
          job_id?: string | null
          labour_charge?: number | null
          parts_total?: number | null
          payment_mode?: string | null
          tax_percent?: number | null
        }
        Update: {
          created_at?: string | null
          discount?: number | null
          grand_total?: number | null
          id?: string
          invoice_url?: string | null
          is_paid?: boolean | null
          job_id?: string | null
          labour_charge?: number | null
          parts_total?: number | null
          payment_mode?: string | null
          tax_percent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_legacy_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_reviews: {
        Row: {
          comments: string | null
          created_at: string | null
          id: string
          job_id: string | null
          score: number
          user_id: string | null
        }
        Insert: {
          comments?: string | null
          created_at?: string | null
          id?: string
          job_id?: string | null
          score: number
          user_id?: string | null
        }
        Update: {
          comments?: string | null
          created_at?: string | null
          id?: string
          job_id?: string | null
          score?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_reviews_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_bonus: {
        Row: {
          amount: number
          created_at: string | null
          created_by: string | null
          id: string
          month: number
          reason: string
          user_id: string
          year: number
        }
        Insert: {
          amount: number
          created_at?: string | null
          created_by?: string | null
          id?: string
          month: number
          reason: string
          user_id: string
          year: number
        }
        Update: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          id?: string
          month?: number
          reason?: string
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "employee_bonus_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_bonus_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_leave: {
        Row: {
          approved_by: string | null
          created_at: string | null
          id: string
          leave_date: string

          reason: string | null
          status: string
          user_id: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string | null
          id?: string
          leave_date: string

          reason?: string | null
          status?: string
          user_id: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string | null
          id?: string
          leave_date?: string

          reason?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_leave_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_leave_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      export_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          drive_file_id: string | null
          drive_link: string | null
          error_message: string | null
          id: string
          started_at: string
          status: string
          target_month: string | null
          type: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          drive_file_id?: string | null
          drive_link?: string | null
          error_message?: string | null
          id?: string
          started_at?: string
          status?: string
          target_month?: string | null
          type: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          drive_file_id?: string | null
          drive_link?: string | null
          error_message?: string | null
          id?: string
          started_at?: string
          status?: string
          target_month?: string | null
          type?: string
        }
        Relationships: []
      }
      geofence_settings: {
        Row: {
          center_lat: number
          center_lng: number
          id: string
          is_active: boolean | null
          radius_meters: number
          updated_at: string | null
        }
        Insert: {
          center_lat: number
          center_lng: number
          id?: string
          is_active?: boolean | null
          radius_meters?: number
          updated_at?: string | null
        }
        Update: {
          center_lat?: number
          center_lng?: number
          id?: string
          is_active?: boolean | null
          radius_meters?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      holidays: {
        Row: {
          created_at: string | null
          date: string
          id: string
          is_recurring: boolean | null
          name: string
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          is_recurring?: boolean | null
          name: string
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          is_recurring?: boolean | null
          name?: string
        }
        Relationships: []
      }
      inventory: {
        Row: {
          cost_price: number | null
          id: string
          item_name: string
          last_updated: string | null
          location: string | null
          low_stock_threshold: number | null
          minimum_stock_level: number | null
          product_id: string | null
          purchase_rate: number | null
          quantity: number | null
          quantity_cached: number | null
          selling_rate: number | null
          unit: string | null
        }
        Insert: {
          cost_price?: number | null
          id?: string
          item_name: string
          last_updated?: string | null
          location?: string | null
          low_stock_threshold?: number | null
          minimum_stock_level?: number | null
          product_id?: string | null
          purchase_rate?: number | null
          quantity?: number | null
          quantity_cached?: number | null
          selling_rate?: number | null
          unit?: string | null
        }
        Update: {
          cost_price?: number | null
          id?: string
          item_name?: string
          last_updated?: string | null
          location?: string | null
          low_stock_threshold?: number | null
          minimum_stock_level?: number | null
          product_id?: string | null
          purchase_rate?: number | null
          quantity?: number | null
          quantity_cached?: number | null
          selling_rate?: number | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_audit_log: {
        Row: {
          change_type: string | null
          changed_at: string | null
          changed_by: string | null
          id: string
          inventory_id: string | null
          new_quantity: number | null
          old_quantity: number | null
        }
        Insert: {
          change_type?: string | null
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          inventory_id?: string | null
          new_quantity?: number | null
          old_quantity?: number | null
        }
        Update: {
          change_type?: string | null
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          inventory_id?: string | null
          new_quantity?: number | null
          old_quantity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_audit_log_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_audit_log_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_transactions: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          inventory_id: string | null
          quantity: number
          reference_note: string | null
          serial_numbers: string | null
          transaction_type: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          inventory_id?: string | null
          quantity: number
          reference_note?: string | null
          serial_numbers?: string | null
          transaction_type: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          inventory_id?: string | null
          quantity?: number
          reference_note?: string | null
          serial_numbers?: string | null
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          cgst_amount: number | null
          cgst_rate: number | null
          created_at: string | null
          discount_amount: number | null
          id: string
          igst_amount: number | null
          igst_rate: number | null
          invoice_id: string
          item_name: string
          line_total: number | null
          product_id: string | null
          quantity: number
          selling_rate: number
          serial_number: string | null
          sgst_amount: number | null
          sgst_rate: number | null
          taxable_amount: number | null
        }
        Insert: {
          cgst_amount?: number | null
          cgst_rate?: number | null
          created_at?: string | null
          discount_amount?: number | null
          id?: string
          igst_amount?: number | null
          igst_rate?: number | null
          invoice_id: string
          item_name: string
          line_total?: number | null
          product_id?: string | null
          quantity?: number
          selling_rate?: number
          serial_number?: string | null
          sgst_amount?: number | null
          sgst_rate?: number | null
          taxable_amount?: number | null
        }
        Update: {
          cgst_amount?: number | null
          cgst_rate?: number | null
          created_at?: string | null
          discount_amount?: number | null
          id?: string
          igst_amount?: number | null
          igst_rate?: number | null
          invoice_id?: string
          item_name?: string
          line_total?: number | null
          product_id?: string | null
          quantity?: number
          selling_rate?: number
          serial_number?: string | null
          sgst_amount?: number | null
          sgst_rate?: number | null
          taxable_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_paid: number | null
          created_at: string | null
          created_by: string | null
          customer_contact: string | null
          customer_email: string | null
          customer_gstin: string | null
          customer_name: string
          discount: number | null
          grand_total: number | null
          id: string
          invoice_code: string
          job_id: string | null
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          round_off: number | null
          status: string | null
          subtotal: number | null
          tax_regime: string | null
          total_cgst: number | null
          total_igst: number | null
          total_sgst: number | null
          total_tax: number | null
        }
        Insert: {
          amount_paid?: number | null
          created_at?: string | null
          created_by?: string | null
          customer_contact?: string | null
          customer_email?: string | null
          customer_gstin?: string | null
          customer_name: string
          discount?: number | null
          grand_total?: number | null
          id?: string
          invoice_code: string
          job_id?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          round_off?: number | null
          status?: string | null
          subtotal?: number | null
          tax_regime?: string | null
          total_cgst?: number | null
          total_igst?: number | null
          total_sgst?: number | null
          total_tax?: number | null
        }
        Update: {
          amount_paid?: number | null
          created_at?: string | null
          created_by?: string | null
          customer_contact?: string | null
          customer_email?: string | null
          customer_gstin?: string | null
          customer_name?: string
          discount?: number | null
          grand_total?: number | null
          id?: string
          invoice_code?: string
          job_id?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          round_off?: number | null
          status?: string | null
          subtotal?: number | null
          tax_regime?: string | null
          total_cgst?: number | null
          total_igst?: number | null
          total_sgst?: number | null
          total_tax?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_materials: {
        Row: {
          checkout_status: string
          created_at: string | null
          id: string
          inventory_id: string | null
          inventory_transaction_id: string | null
          job_id: string | null
          material_name: string
          photo_drive_file_id: string | null
          product_id: string | null
          qty_taken: number | null
          quantity: number
          returned_at: string | null
          status: string | null
          technician_id: string | null
          total_cost: number | null
          unit_cost: number
          usage_confirmed_at: string | null
        }
        Insert: {
          checkout_status?: string
          created_at?: string | null
          id?: string
          inventory_id?: string | null
          inventory_transaction_id?: string | null
          job_id?: string | null
          material_name: string
          photo_drive_file_id?: string | null
          product_id?: string | null
          qty_taken?: number | null
          quantity: number
          returned_at?: string | null
          status?: string | null
          technician_id?: string | null
          total_cost?: number | null
          unit_cost: number
          usage_confirmed_at?: string | null
        }
        Update: {
          checkout_status?: string
          created_at?: string | null
          id?: string
          inventory_id?: string | null
          inventory_transaction_id?: string | null
          job_id?: string | null
          material_name?: string
          photo_drive_file_id?: string | null
          product_id?: string | null
          qty_taken?: number | null
          quantity?: number
          returned_at?: string | null
          status?: string | null
          technician_id?: string | null
          total_cost?: number | null
          unit_cost?: number
          usage_confirmed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_materials_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_materials_inventory_transaction_id_fkey"
            columns: ["inventory_transaction_id"]
            isOneToOne: false
            referencedRelation: "inventory_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_materials_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_materials_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_materials_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      job_technicians: {
        Row: {
          assigned_at: string
          id: string
          job_id: string
          removed_at: string | null
          technician_id: string
        }
        Insert: {
          assigned_at?: string
          id?: string
          job_id: string
          removed_at?: string | null
          technician_id: string
        }
        Update: {
          assigned_at?: string
          id?: string
          job_id?: string
          removed_at?: string | null
          technician_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_technicians_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_technicians_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      job_types: {
        Row: {
          created_at: string | null
          customer_charge_amount: number
          id: string
          is_active: boolean
          technician_incentive: number
          title: string
        }
        Insert: {
          created_at?: string | null
          customer_charge_amount?: number
          id?: string
          is_active?: boolean
          technician_incentive?: number
          title: string
        }
        Update: {
          created_at?: string | null
          customer_charge_amount?: number
          id?: string
          is_active?: boolean
          technician_incentive?: number
          title?: string
        }
        Relationships: []
      }
      jobs: {
        Row: {
          advance_amount: number | null
          completed_at: string | null
          created_at: string | null
          customer_contact: string
          customer_email: string | null
          customer_gstin: string | null
          customer_name: string
          device_type_id: string | null
          id: string
          job_code: string
          job_type: string | null
          job_type_ref_id: string | null
          priority: string | null
          receptionist_id: string | null
          remarks: string | null
          reported_issue: string
          snap_technician_incentive: number | null
          status: string | null
          status_changed_at: string | null
          technician_id: string | null
          work_notes: string | null
        }
        Insert: {
          advance_amount?: number | null
          completed_at?: string | null
          created_at?: string | null
          customer_contact: string
          customer_email?: string | null
          customer_gstin?: string | null
          customer_name: string
          device_type_id?: string | null
          id?: string
          job_code?: string
          job_type?: string | null
          job_type_ref_id?: string | null
          priority?: string | null
          receptionist_id?: string | null
          remarks?: string | null
          reported_issue: string
          snap_technician_incentive?: number | null
          status?: string | null
          status_changed_at?: string | null
          technician_id?: string | null
          work_notes?: string | null
        }
        Update: {
          advance_amount?: number | null
          completed_at?: string | null
          created_at?: string | null
          customer_contact?: string
          customer_email?: string | null
          customer_gstin?: string | null
          customer_name?: string
          device_type_id?: string | null
          id?: string
          job_code?: string
          job_type?: string | null
          job_type_ref_id?: string | null
          priority?: string | null
          receptionist_id?: string | null
          remarks?: string | null
          reported_issue?: string
          snap_technician_incentive?: number | null
          status?: string | null
          status_changed_at?: string | null
          technician_id?: string | null
          work_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_device_type_id_fkey"
            columns: ["device_type_id"]
            isOneToOne: false
            referencedRelation: "ui_device_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_job_type_ref_id_fkey"
            columns: ["job_type_ref_id"]
            isOneToOne: false
            referencedRelation: "job_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_receptionist_id_fkey"
            columns: ["receptionist_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      material_allotments: {
        Row: {
          allotted_at: string | null
          allotted_by: string | null
          id: string
          inventory_id: string | null
          job_id: string | null
          quantity: number
          returned_at: string | null
          status: string | null
        }
        Insert: {
          allotted_at?: string | null
          allotted_by?: string | null
          id?: string
          inventory_id?: string | null
          job_id?: string | null
          quantity: number
          returned_at?: string | null
          status?: string | null
        }
        Update: {
          allotted_at?: string | null
          allotted_by?: string | null
          id?: string
          inventory_id?: string | null
          job_id?: string | null
          quantity?: number
          returned_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "material_allotments_allotted_by_fkey"
            columns: ["allotted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_allotments_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_allotments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          channel: string
          created_at: string | null
          id: string
          is_read: boolean | null
          job_id: string | null
          message: string
          recipient_user_id: string | null
          sent_at: string | null
          status: string | null
          title: string | null
          type: string | null
        }
        Insert: {
          channel?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          job_id?: string | null
          message: string
          recipient_user_id?: string | null
          sent_at?: string | null
          status?: string | null
          title?: string | null
          type?: string | null
        }
        Update: {
          channel?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          job_id?: string | null
          message?: string
          recipient_user_id?: string | null
          sent_at?: string | null
          status?: string | null
          title?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_recipient_user_id_fkey"
            columns: ["recipient_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      onsite_visits: {
        Row: {
          arrival_drive_file_id: string | null
          arrival_gps_lat: number | null
          arrival_gps_lng: number | null
          arrival_time: string | null
          departure_drive_file_id: string | null
          departure_gps_lat: number | null
          departure_gps_lng: number | null
          departure_time: string | null
          id: string
          job_id: string | null
          technician_id: string | null
        }
        Insert: {
          arrival_drive_file_id?: string | null
          arrival_gps_lat?: number | null
          arrival_gps_lng?: number | null
          arrival_time?: string | null
          departure_drive_file_id?: string | null
          departure_gps_lat?: number | null
          departure_gps_lng?: number | null
          departure_time?: string | null
          id?: string
          job_id?: string | null
          technician_id?: string | null
        }
        Update: {
          arrival_drive_file_id?: string | null
          arrival_gps_lat?: number | null
          arrival_gps_lng?: number | null
          arrival_time?: string | null
          departure_drive_file_id?: string | null
          departure_gps_lat?: number | null
          departure_gps_lng?: number | null
          departure_time?: string | null
          id?: string
          job_id?: string | null
          technician_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "onsite_visits_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onsite_visits_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          type: string
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          type: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_audit_log: {
        Row: {
          action: string | null
          changed_at: string | null
          changed_by: string | null
          details: Json | null
          id: string
          new_snapshot: Json | null
          old_snapshot: Json | null
          performed_by: string | null
          salary_id: string | null
          user_id: string | null
        }
        Insert: {
          action?: string | null
          changed_at?: string | null
          changed_by?: string | null
          details?: Json | null
          id?: string
          new_snapshot?: Json | null
          old_snapshot?: Json | null
          performed_by?: string | null
          salary_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string | null
          changed_at?: string | null
          changed_by?: string | null
          details?: Json | null
          id?: string
          new_snapshot?: Json | null
          old_snapshot?: Json | null
          performed_by?: string | null
          salary_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_audit_log_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_audit_log_salary_id_fkey"
            columns: ["salary_id"]
            isOneToOne: false
            referencedRelation: "salary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_uploads: {
        Row: {
          attempts: number
          created_at: string
          id: string
          last_error: string | null
          payload_json: Json
          reference_id: string
          reference_table: string
          type: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          id?: string
          last_error?: string | null
          payload_json?: Json
          reference_id: string
          reference_table: string
          type: string
        }
        Update: {
          attempts?: number
          created_at?: string
          id?: string
          last_error?: string | null
          payload_json?: Json
          reference_id?: string
          reference_table?: string
          type?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          brand: string | null
          category: string | null
          cgst_rate: number | null
          created_at: string | null
          created_by: string | null
          description: string | null
          hsn_sac: string | null
          id: string
          igst_rate: number | null
          is_active: boolean | null
          name: string
          sgst_rate: number | null
          sku: string | null
          tax_mode: string | null
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          brand?: string | null
          category?: string | null
          cgst_rate?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          hsn_sac?: string | null
          id?: string
          igst_rate?: number | null
          is_active?: boolean | null
          name: string
          sgst_rate?: number | null
          sku?: string | null
          tax_mode?: string | null
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          brand?: string | null
          category?: string | null
          cgst_rate?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          hsn_sac?: string | null
          id?: string
          igst_rate?: number | null
          is_active?: boolean | null
          name?: string
          sgst_rate?: number | null
          sku?: string | null
          tax_mode?: string | null
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      salary: {
        Row: {
          absence_deduction_total: number | null
          advance_deducted: number | null
          base_daily_rate: number | null
          bonus_amount: number | null
          created_at: string | null
          customer_review_bonus_total: number | null
          customer_review_deduction: number | null
          early_deduction: number | null
          early_deduction_per_hour: number | null
          early_hours: number | null
          early_in_bonus_total: number | null
          early_out_deduction_total: number | null
          generated_by: string | null
          gross_salary: number | null
          halfday_count: number | null
          halfday_deduction_total: number | null
          id: string
          incentive_amount: number | null
          job_completion_bonus: number | null
          late_deduction: number | null
          late_in_deduction_total: number | null
          late_out_bonus_total: number | null
          leave_count: number | null
          leave_deduction: number | null
          month: string
          monthly_salary_base: number | null
          net_salary: number | null
          ot_hours: number | null
          ot_rate_per_hour: number | null
          overtime_pay: number | null
          paid_at: string | null
          present_days: number | null
          status: string | null
          user_id: string | null
          working_days: number | null
        }
        Insert: {
          absence_deduction_total?: number | null
          advance_deducted?: number | null
          base_daily_rate?: number | null
          bonus_amount?: number | null
          created_at?: string | null
          customer_review_bonus_total?: number | null
          customer_review_deduction?: number | null
          early_deduction?: number | null
          early_deduction_per_hour?: number | null
          early_hours?: number | null
          early_in_bonus_total?: number | null
          early_out_deduction_total?: number | null
          generated_by?: string | null
          gross_salary?: number | null
          halfday_count?: number | null
          halfday_deduction_total?: number | null
          id?: string
          incentive_amount?: number | null
          job_completion_bonus?: number | null
          late_deduction?: number | null
          late_in_deduction_total?: number | null
          late_out_bonus_total?: number | null
          leave_count?: number | null
          leave_deduction?: number | null
          month: string
          monthly_salary_base?: number | null
          net_salary?: number | null
          ot_hours?: number | null
          ot_rate_per_hour?: number | null
          overtime_pay?: number | null
          paid_at?: string | null
          present_days?: number | null
          status?: string | null
          user_id?: string | null
          working_days?: number | null
        }
        Update: {
          absence_deduction_total?: number | null
          advance_deducted?: number | null
          base_daily_rate?: number | null
          bonus_amount?: number | null
          created_at?: string | null
          customer_review_bonus_total?: number | null
          customer_review_deduction?: number | null
          early_deduction?: number | null
          early_deduction_per_hour?: number | null
          early_hours?: number | null
          early_in_bonus_total?: number | null
          early_out_deduction_total?: number | null
          generated_by?: string | null
          gross_salary?: number | null
          halfday_count?: number | null
          halfday_deduction_total?: number | null
          id?: string
          incentive_amount?: number | null
          job_completion_bonus?: number | null
          late_deduction?: number | null
          late_in_deduction_total?: number | null
          late_out_bonus_total?: number | null
          leave_count?: number | null
          leave_deduction?: number | null
          month?: string
          monthly_salary_base?: number | null
          net_salary?: number | null
          ot_hours?: number | null
          ot_rate_per_hour?: number | null
          overtime_pay?: number | null
          paid_at?: string | null
          present_days?: number | null
          status?: string | null
          user_id?: string | null
          working_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "salary_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          id: string
          inventory_id: string | null
          item_name: string
          quantity: number
          sale_id: string | null
          serial_number: string | null
          total_price: number | null
          unit_price: number
        }
        Insert: {
          id?: string
          inventory_id?: string | null
          item_name: string
          quantity: number
          sale_id?: string | null
          serial_number?: string | null
          total_price?: number | null
          unit_price: number
        }
        Update: {
          id?: string
          inventory_id?: string | null
          item_name?: string
          quantity?: number
          sale_id?: string | null
          serial_number?: string | null
          total_price?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_types: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean
          receptionist_incentive: number
          title: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean
          receptionist_incentive?: number
          title: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean
          receptionist_incentive?: number
          title?: string
        }
        Relationships: []
      }
      sales: {
        Row: {
          created_at: string | null
          created_by: string | null
          customer_contact: string | null
          customer_gstin: string | null
          customer_name: string
          discount: number | null
          grand_total: number | null
          id: string
          invoice_number: string | null
          payment_mode: string | null
          sale_code: string | null
          sale_type_id: string | null
          snap_receptionist_incentive: number | null
          status: string | null
          subtotal: number | null
          tax_percent: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          customer_contact?: string | null
          customer_gstin?: string | null
          customer_name: string
          discount?: number | null
          grand_total?: number | null
          id?: string
          invoice_number?: string | null
          payment_mode?: string | null
          sale_code?: string | null
          sale_type_id?: string | null
          snap_receptionist_incentive?: number | null
          status?: string | null
          subtotal?: number | null
          tax_percent?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          customer_contact?: string | null
          customer_gstin?: string | null
          customer_name?: string
          discount?: number | null
          grand_total?: number | null
          id?: string
          invoice_number?: string | null
          payment_mode?: string | null
          sale_code?: string | null
          sale_type_id?: string | null
          snap_receptionist_incentive?: number | null
          status?: string | null
          subtotal?: number | null
          tax_percent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_sale_type_id_fkey"
            columns: ["sale_type_id"]
            isOneToOne: false
            referencedRelation: "sale_types"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_incentives: {
        Row: {
          accrued_at: string | null
          amount: number
          created_at: string | null
          description: string | null
          id: string
          job_id: string | null
          role_type: string | null
          sale_id: string | null
          source_type: string | null
          user_id: string
        }
        Insert: {
          accrued_at?: string | null
          amount?: number
          created_at?: string | null
          description?: string | null
          id?: string
          job_id?: string | null
          role_type?: string | null
          sale_id?: string | null
          source_type?: string | null
          user_id: string
        }
        Update: {
          accrued_at?: string | null
          amount?: number
          created_at?: string | null
          description?: string | null
          id?: string
          job_id?: string | null
          role_type?: string | null
          sale_id?: string | null
          source_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_incentives_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_incentives_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_incentives_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_rates: {
        Row: {
          absent_day_deduction: number | null
          allowed_leave_days: number | null
          base_daily_rate: number | null
          base_pay: number | null
          customer_review_bonus: number | null
          customer_review_penalty: number | null
          early_deduction_per_hour: number | null
          early_in_bonus: number | null
          halfday_deduction: number | null
          job_completion_bonus_amount: number | null
          job_completion_bonus_threshold: number | null
          late_in_deduction: number | null
          late_in_threshold_minutes: number | null
          late_out_bonus: number | null
          max_leave_allowed: number | null
          monthly_salary: number | null
          ot_rate_per_hour: number | null
          penalty_tier1_amount: number | null
          penalty_tier2_amount: number | null
          technician_incentive_percent: number | null
          user_id: string
        }
        Insert: {
          absent_day_deduction?: number | null
          allowed_leave_days?: number | null
          base_daily_rate?: number | null
          base_pay?: number | null
          customer_review_bonus?: number | null
          customer_review_penalty?: number | null
          early_deduction_per_hour?: number | null
          early_in_bonus?: number | null
          halfday_deduction?: number | null
          job_completion_bonus_amount?: number | null
          job_completion_bonus_threshold?: number | null
          late_in_deduction?: number | null
          late_in_threshold_minutes?: number | null
          late_out_bonus?: number | null
          max_leave_allowed?: number | null
          monthly_salary?: number | null
          ot_rate_per_hour?: number | null
          penalty_tier1_amount?: number | null
          penalty_tier2_amount?: number | null
          technician_incentive_percent?: number | null
          user_id: string
        }
        Update: {
          absent_day_deduction?: number | null
          allowed_leave_days?: number | null
          base_daily_rate?: number | null
          base_pay?: number | null
          customer_review_bonus?: number | null
          customer_review_penalty?: number | null
          early_deduction_per_hour?: number | null
          early_in_bonus?: number | null
          halfday_deduction?: number | null
          job_completion_bonus_amount?: number | null
          job_completion_bonus_threshold?: number | null
          late_in_deduction?: number | null
          late_in_threshold_minutes?: number | null
          late_out_bonus?: number | null
          max_leave_allowed?: number | null
          monthly_salary?: number | null
          ot_rate_per_hour?: number | null
          penalty_tier1_amount?: number | null
          penalty_tier2_amount?: number | null
          technician_incentive_percent?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_rates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ui_device_types: {
        Row: {
          code: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          label: string | null
          sort_order: number | null
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          id: string
          is_active?: boolean | null
          label?: string | null
          sort_order?: number | null
        }
        Update: {
          code?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          label?: string | null
          sort_order?: number | null
        }
        Relationships: []
      }
      ui_job_statuses: {
        Row: {
          code: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          label: string | null
          sort_order: number | null
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          id: string
          is_active?: boolean | null
          label?: string | null
          sort_order?: number | null
        }
        Update: {
          code?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          label?: string | null
          sort_order?: number | null
        }
        Relationships: []
      }
      ui_payment_methods: {
        Row: {
          code: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          label: string | null
          sort_order: number | null
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          id: string
          is_active?: boolean | null
          label?: string | null
          sort_order?: number | null
        }
        Update: {
          code?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          label?: string | null
          sort_order?: number | null
        }
        Relationships: []
      }
      ui_payment_statuses: {
        Row: {
          code: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          label: string | null
          sort_order: number | null
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          id: string
          is_active?: boolean | null
          label?: string | null
          sort_order?: number | null
        }
        Update: {
          code?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          label?: string | null
          sort_order?: number | null
        }
        Relationships: []
      }
      ui_priorities: {
        Row: {
          code: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          label: string | null
          sort_order: number | null
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          id: string
          is_active?: boolean | null
          label?: string | null
          sort_order?: number | null
        }
        Update: {
          code?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          label?: string | null
          sort_order?: number | null
        }
        Relationships: []
      }
      ui_roles: {
        Row: {
          code: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          label: string | null
          sort_order: number | null
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          id: string
          is_active?: boolean | null
          label?: string | null
          sort_order?: number | null
        }
        Update: {
          code?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          label?: string | null
          sort_order?: number | null
        }
        Relationships: []
      }
      ui_sale_statuses: {
        Row: {
          code: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          label: string | null
          sort_order: number | null
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          id: string
          is_active?: boolean | null
          label?: string | null
          sort_order?: number | null
        }
        Update: {
          code?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          label?: string | null
          sort_order?: number | null
        }
        Relationships: []
      }
      ui_service_locations: {
        Row: {
          code: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          label: string | null
          sort_order: number | null
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          id: string
          is_active?: boolean | null
          label?: string | null
          sort_order?: number | null
        }
        Update: {
          code?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          label?: string | null
          sort_order?: number | null
        }
        Relationships: []
      }
      users: {
        Row: {
          avatar_drive_file_id: string | null
          created_at: string | null
          email: string
          expo_push_token: string | null
          id: string
          is_active: boolean | null
          name: string
          phone: string | null
          role: string
        }
        Insert: {
          avatar_drive_file_id?: string | null
          created_at?: string | null
          email: string
          expo_push_token?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          phone?: string | null
          role: string
        }
        Update: {
          avatar_drive_file_id?: string | null
          created_at?: string | null
          email?: string
          expo_push_token?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          phone?: string | null
          role?: string
        }
        Relationships: []
      }
      whatsapp_logs: {
        Row: {
          created_at: string | null
          error_detail: string | null
          event_type: string | null
          id: string
          payload: Json | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          error_detail?: string | null
          event_type?: string | null
          id?: string
          payload?: Json | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          error_detail?: string | null
          event_type?: string | null
          id?: string
          payload?: Json | null
          status?: string | null
        }
        Relationships: []
      }
      whatsapp_messages: {
        Row: {
          created_at: string | null
          error_detail: string | null
          id: string
          job_id: string | null
          message_body: string | null
          sent_at: string | null
          status: string | null
          to_number: string | null
        }
        Insert: {
          created_at?: string | null
          error_detail?: string | null
          id?: string
          job_id?: string | null
          message_body?: string | null
          sent_at?: string | null
          status?: string | null
          to_number?: string | null
        }
        Update: {
          created_at?: string | null
          error_detail?: string | null
          id?: string
          job_id?: string | null
          message_body?: string | null
          sent_at?: string | null
          status?: string | null
          to_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_settings: {
        Row: {
          account_sid: string | null
          auth_token_enc: string | null
          from_number: string | null
          id: string
          is_active: boolean | null
          provider: string
          updated_at: string | null
          webhook_url: string | null
        }
        Insert: {
          account_sid?: string | null
          auth_token_enc?: string | null
          from_number?: string | null
          id?: string
          is_active?: boolean | null
          provider?: string
          updated_at?: string | null
          webhook_url?: string | null
        }
        Update: {
          account_sid?: string | null
          auth_token_enc?: string | null
          from_number?: string | null
          id?: string
          is_active?: boolean | null
          provider?: string
          updated_at?: string | null
          webhook_url?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_stock: {
        Args: {
          p_notes: string
          p_product_id: string
          p_quantity: number
          p_rate: number
          p_serial_numbers?: string
        }
        Returns: undefined
      }
      create_invoice: {
        Args: {
          p_customer_contact?: string
          p_customer_email?: string
          p_customer_gstin?: string
          p_customer_name: string
          p_discount?: number
          p_items?: Json
          p_job_id?: string
          p_notes?: string
          p_payment_method?: string
          p_status?: string
          p_tax_regime?: string
        }
        Returns: Json
      }
      create_product_with_opening_stock: {
        Args: {
          p_cgst_rate: number
          p_hsn_sac: string
          p_igst_rate: number
          p_is_active: boolean
          p_location: string
          p_low_stock_threshold: number
          p_minimum_stock_level: number
          p_name: string
          p_opening_quantity: number
          p_purchase_rate: number
          p_selling_rate: number
          p_sgst_rate: number
          p_sku: string
          p_tax_mode: string
          p_unit: string
        }
        Returns: string
      }
      generate_invoice_code: { Args: never; Returns: string }
      generate_job_code: { Args: never; Returns: string }
      generate_sale_code: { Args: never; Returns: string }
      get_user_role: { Args: never; Returns: string }
      is_admin: { Args: never; Returns: boolean }
      is_receptionist: { Args: never; Returns: boolean }
      is_staff: { Args: never; Returns: boolean }
      is_technician: { Args: never; Returns: boolean }
      preview_invoice: {
        Args: { p_discount?: number; p_items?: Json; p_tax_regime?: string }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
