export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      devices: {
        Row: {
          id: string
          last_used_at: string | null
          nickname: string | null
        }
        Insert: {
          id: string
          last_used_at?: string | null
          nickname?: string | null
        }
        Update: {
          id?: string
          last_used_at?: string | null
          nickname?: string | null
        }
        Relationships: []
      }
      menu_items: {
        Row: {
          available: boolean | null
          category: string
          created_at: string | null
          description: string | null
          id: string
          name: string
          price: number | null
          toppings_config: Json | null
        }
        Insert: {
          available?: boolean | null
          category: string
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          price?: number | null
          toppings_config?: Json | null
        }
        Update: {
          available?: boolean | null
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          price?: number | null
          toppings_config?: Json | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string | null
          id: string
          menu_item_id: string | null
          notes: string | null
          order_id: string | null
          toppings: Json | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          menu_item_id?: string | null
          notes?: string | null
          order_id?: string | null
          toppings?: Json | null
        }
        Update: {
          created_at?: string | null
          id?: string
          menu_item_id?: string | null
          notes?: string | null
          order_id?: string | null
          toppings?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string | null
          device_id: string | null
          id: string
          seat_id: string | null
          status: string | null
          teacher_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          device_id?: string | null
          id?: string
          seat_id?: string | null
          status?: string | null
          teacher_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          device_id?: string | null
          id?: string
          seat_id?: string | null
          status?: string | null
          teacher_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_seat_id_fkey"
            columns: ["seat_id"]
            isOneToOne: false
            referencedRelation: "seats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      pre_order_items: {
        Row: {
          created_at: string | null
          id: string
          menu_item_id: string | null
          notes: string | null
          pre_order_id: string | null
          toppings: Json | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          menu_item_id?: string | null
          notes?: string | null
          pre_order_id?: string | null
          toppings?: Json | null
        }
        Update: {
          created_at?: string | null
          id?: string
          menu_item_id?: string | null
          notes?: string | null
          pre_order_id?: string | null
          toppings?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "pre_order_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pre_order_items_pre_order_id_fkey"
            columns: ["pre_order_id"]
            isOneToOne: false
            referencedRelation: "pre_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      pre_orders: {
        Row: {
          created_at: string | null
          device_id: string | null
          fulfilled: boolean | null
          id: string
          teacher_id: string | null
        }
        Insert: {
          created_at?: string | null
          device_id?: string | null
          fulfilled?: boolean | null
          id?: string
          teacher_id?: string | null
        }
        Update: {
          created_at?: string | null
          device_id?: string | null
          fulfilled?: boolean | null
          id?: string
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pre_orders_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      seat_assignments: {
        Row: {
          active: boolean | null
          created_at: string | null
          device_id: string | null
          id: string
          seat_id: string | null
          teacher_id: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          device_id?: string | null
          id?: string
          seat_id?: string | null
          teacher_id?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          device_id?: string | null
          id?: string
          seat_id?: string | null
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seat_assignments_seat_id_fkey"
            columns: ["seat_id"]
            isOneToOne: false
            referencedRelation: "seats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seat_assignments_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      seats: {
        Row: {
          id: string
          position: number
          table_id: number | null
        }
        Insert: {
          id?: string
          position: number
          table_id?: number | null
        }
        Update: {
          id?: string
          position?: number
          table_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "seats_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
        ]
      }
      system_config: {
        Row: {
          key: string
          value: string
        }
        Insert: {
          key: string
          value: string
        }
        Update: {
          key?: string
          value?: string
        }
        Relationships: []
      }
      tables: {
        Row: {
          id: number
        }
        Insert: {
          id: number
        }
        Update: {
          id?: number
        }
        Relationships: []
      }
      teachers: {
        Row: {
          created_at: string | null
          dietary_notes: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          dietary_notes?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          dietary_notes?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
