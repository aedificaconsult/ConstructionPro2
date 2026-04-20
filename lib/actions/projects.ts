'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { ProjectFormData, ProjectStatus } from '@/types';

export async function getProjects() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('project_summary')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getProject(id: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function createProject(formData: ProjectFormData) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('projects')
    .insert({
      name: formData.name,
      description: formData.description || null,
      location: formData.location || null,
      start_date: formData.start_date || null,
      end_date: formData.end_date || null,
      status: formData.status || 'Not Started',
    })
    .select()
    .single();
  if (error) throw error;
  revalidatePath('/projects');
  revalidatePath('/dashboard');
  return data;
}

export async function updateProject(id: string, updates: Partial<ProjectFormData>) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  revalidatePath(`/projects/${id}`);
  revalidatePath('/projects');
  revalidatePath('/dashboard');
  return data;
}

export async function updateProjectStatus(id: string, status: ProjectStatus) {
  return updateProject(id, { status });
}

export async function deleteProject(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) throw error;
  revalidatePath('/projects');
  revalidatePath('/dashboard');
}

// ---- PROJECT ITEMS ----

export async function getProjectBOQ(projectId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('project_boq')
    .select('*')
    .eq('project_id', projectId)
    .order('category_name')
    .order('subcategory_name');
  if (error) throw error;
  return data;
}

export async function getProjectItems(projectId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('project_items')
    .select(`
      *,
      work_items (
        id, description, rate,
        units (id, name, abbreviation),
        work_subcategories (
          id, name,
          work_categories (id, name, color)
        )
      )
    `)
    .eq('project_id', projectId);
  if (error) throw error;
  return data;
}

export async function addItemToProject(
  projectId: string,
  workItemId: string,
  contractQuantity: number
) {
  const supabase = createClient();
  
  // Get the work item rate
  const { data: workItem, error: wiError } = await supabase
    .from('work_items')
    .select('rate')
    .eq('id', workItemId)
    .single();
  if (wiError) throw wiError;
  
  const contractAmount = contractQuantity * workItem.rate;
  
  const { data, error } = await supabase
    .from('project_items')
    .insert({
      project_id: projectId,
      work_item_id: workItemId,
      contract_amount: contractAmount,
      contract_quantity: contractQuantity,
      executed_amount: 0,
      executed_quantity: 0,
    })
    .select()
    .single();
  if (error) throw error;
  revalidatePath(`/projects/${projectId}`);
  return data;
}

export async function updateExecutedAmount(
  projectItemId: string,
  projectId: string,
  executedQuantity: number,
  note?: string
) {
  const supabase = createClient();
  
  // Get the work item rate
  const { data: projectItem, error: piError } = await supabase
    .from('project_items')
    .select('work_item_id')
    .eq('id', projectItemId)
    .single();
  if (piError) throw piError;
  
  const { data: workItem, error: wiError } = await supabase
    .from('work_items')
    .select('rate')
    .eq('id', projectItem.work_item_id)
    .single();
  if (wiError) throw wiError;
  
  const executedAmount = executedQuantity * workItem.rate;
  
  // Update project item
  const { data, error } = await supabase
    .from('project_items')
    .update({
      executed_amount: executedAmount,
      executed_quantity: executedQuantity,
    })
    .eq('id', projectItemId)
    .select()
    .single();
  if (error) throw error;

  // Record snapshot
  await supabase.from('progress_snapshots').insert({
    project_item_id: projectItemId,
    executed_amount: executedAmount,
    executed_quantity: executedQuantity,
    note: note || null,
  });

  revalidatePath(`/projects/${projectId}`);
  return data;
}

export async function removeProjectItem(projectItemId: string, projectId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from('project_items')
    .delete()
    .eq('id', projectItemId);
  if (error) throw error;
  revalidatePath(`/projects/${projectId}`);
}

// ---- TAKE OFF ROWS ----

export async function getTakeOffRows(projectItemId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('take_off_rows')
    .select('*')
    .eq('project_item_id', projectItemId)
    .order('created_at');
  if (error) throw error;
  return data;
}

export async function addTakeOffRow(
  projectItemId: string,
  projectId: string,
  formData: {
    description: string;
    number_of_items: number;
    length?: number;
    width?: number;
    height?: number;
    unit_mass_per_meter?: number;
  }
) {
  const supabase = createClient();

  // Get the unit to determine calculation method
  const { data: projectItem } = await supabase
    .from('project_items')
    .select(`
      work_items!inner (
        units!inner (abbreviation)
      )
    `)
    .eq('id', projectItemId)
    .single();

  const unit = (projectItem as any)?.work_items?.units?.abbreviation;
  if (!unit) throw new Error('Work item unit not found');
  const { number_of_items, length, width, height, unit_mass_per_meter } = formData;

  // Calculate quantity based on unit type
  let calculated_quantity = 0;
  switch (unit) {
    case 'm': // Linear
      calculated_quantity = number_of_items * (length || 0);
      break;
    case 'm²': // Area
      calculated_quantity = number_of_items * (length || 0) * (width || 0);
      break;
    case 'm³': // Volume
      calculated_quantity = number_of_items * (length || 0) * (width || 0) * (height || 0);
      break;
    case 'kg': // Mass
      calculated_quantity = number_of_items * (length || 0) * (unit_mass_per_meter || 0);
      break;
    default:
      calculated_quantity = number_of_items * (length || 0);
  }

  const { data, error } = await supabase
    .from('take_off_rows')
    .insert({
      project_item_id: projectItemId,
      description: formData.description,
      number_of_items,
      length,
      width,
      height,
      unit_mass_per_meter,
      calculated_quantity,
    })
    .select()
    .single();

  if (error) throw error;
  revalidatePath(`/projects/${projectId}`);
  return data;
}

export async function updateTakeOffRow(
  takeOffRowId: string,
  projectId: string,
  formData: {
    description: string;
    number_of_items: number;
    length?: number;
    width?: number;
    height?: number;
    unit_mass_per_meter?: number;
  }
) {
  const supabase = createClient();

  // Get the unit to determine calculation method
  const { data: takeOffRow } = await supabase
    .from('take_off_rows')
    .select(`
      project_item_id,
      project_items!inner (
        work_items!inner (
          units!inner (abbreviation)
        )
      )
    `)
    .eq('id', takeOffRowId)
    .single();

  const unit = (takeOffRow as any)?.project_items?.work_items?.units?.abbreviation;
  if (!unit) throw new Error('Work item unit not found');
  const { number_of_items, length, width, height, unit_mass_per_meter } = formData;

  // Calculate quantity based on unit type
  let calculated_quantity = 0;
  switch (unit) {
    case 'm': // Linear
      calculated_quantity = number_of_items * (length || 0);
      break;
    case 'm²': // Area
      calculated_quantity = number_of_items * (length || 0) * (width || 0);
      break;
    case 'm³': // Volume
      calculated_quantity = number_of_items * (length || 0) * (width || 0) * (height || 0);
      break;
    case 'kg': // Mass
      calculated_quantity = number_of_items * (length || 0) * (unit_mass_per_meter || 0);
      break;
    default:
      calculated_quantity = number_of_items * (length || 0);
  }

  const { data, error } = await supabase
    .from('take_off_rows')
    .update({
      description: formData.description,
      number_of_items,
      length,
      width,
      height,
      unit_mass_per_meter,
      calculated_quantity,
    })
    .eq('id', takeOffRowId)
    .select()
    .single();

  if (error) throw error;
  revalidatePath(`/projects/${projectId}`);
  return data;
}

export async function removeTakeOffRow(takeOffRowId: string, projectId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from('take_off_rows')
    .delete()
    .eq('id', takeOffRowId);
  if (error) throw error;
  revalidatePath(`/projects/${projectId}`);
}

// ---- TAKE OFF EXPORT ----

export async function getTakeOffDataForExport(projectId: string) {
  const supabase = createClient();
  
  // Get project details
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();
  if (projectError) throw projectError;

  // Get all take-off data organized by project items
  const { data: boq, error: boqError } = await supabase
    .from('project_boq')
    .select('*')
    .eq('project_id', projectId)
    .order('category_name')
    .order('subcategory_name');
  if (boqError) throw boqError;

  // Get take-off rows for each item
  const takeOffData = await Promise.all(
    boq.map(async (item) => {
      const { data: rows, error } = await supabase
        .from('take_off_rows')
        .select('*')
        .eq('project_item_id', item.project_item_id)
        .order('created_at');
      if (error) throw error;
      return {
        ...item,
        take_off_rows: rows || [],
      };
    })
  );

  return { project, takeOffData };
}
