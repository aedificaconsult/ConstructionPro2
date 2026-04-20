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
  contractAmount: number,
  contractQuantity: number
) {
  const supabase = createClient();
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
  executedAmount: number,
  executedQuantity: number,
  note?: string
) {
  const supabase = createClient();

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
