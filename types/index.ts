// ============================================================
// Database Types
// ============================================================

export interface Unit {
  id: string;
  name: string;
  abbreviation: string;
  created_at: string;
}

export interface WorkCategory {
  id: string;
  name: string;
  description: string | null;
  color: string;
  created_at: string;
}

export interface WorkSubcategory {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  created_at: string;
  work_categories?: WorkCategory;
}

export interface WorkItem {
  id: string;
  subcategory_id: string;
  description: string;
  unit_id: string;
  rate: number;
  created_at: string;
  units?: Unit;
  work_subcategories?: WorkSubcategory & { work_categories?: WorkCategory };
}

export type ProjectStatus = 'Not Started' | 'In Progress' | 'Completed' | 'On Hold';

export interface Project {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
}

export interface ProjectItem {
  id: string;
  project_id: string;
  work_item_id: string;
  contract_quantity: number;
  contract_amount: number;
  executed_quantity: number;
  executed_amount: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  work_items?: WorkItem & {
    units?: Unit;
    work_subcategories?: WorkSubcategory & { work_categories?: WorkCategory };
  };
}

export interface ProgressSnapshot {
  id: string;
  project_item_id: string;
  executed_amount: number;
  executed_quantity: number | null;
  note: string | null;
  recorded_at: string;
}

export interface TakeOffRow {
  id: string;
  project_item_id: string;
  description: string;
  number_of_items: number;
  length: number | null;
  width: number | null;
  height: number | null;
  unit_mass_per_meter: number | null;
  calculated_quantity: number;
  created_at: string;
  updated_at: string;
}

// ============================================================
// View Types
// ============================================================

export interface ProjectSummary {
  id: string;
  name: string;
  location: string | null;
  status: ProjectStatus;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  item_count: number;
  total_contract_amount: number;
  total_executed_amount: number;
  progress_percent: number;
}

export interface ProjectBOQRow {
  project_item_id: string;
  project_id: string;
  project_name: string;
  work_item_id: string;
  item_description: string;
  unit: string;
  rate: number;
  contract_quantity: number;
  contract_amount: number;
  executed_quantity: number;
  executed_amount: number;
  progress_percent: number;
  subcategory_name: string;
  category_name: string;
  category_color: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Form Types
// ============================================================

export interface ProjectFormData {
  name: string;
  description: string;
  location: string;
  start_date: string;
  end_date: string;
  status: ProjectStatus;
}

export interface WorkItemFormData {
  subcategory_id: string;
  description: string;
  unit_id: string;
  rate: string;
}

export interface AddProjectItemFormData {
  work_item_id: string;
  contract_quantity: string;
}

export interface UpdateProgressFormData {
  executed_quantity: string;
  note: string;
}

export interface TakeOffRowFormData {
  description: string;
  number_of_items: string;
  length: string;
  width: string;
  height: string;
  unit_mass_per_meter: string;
}
