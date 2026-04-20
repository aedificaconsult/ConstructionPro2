'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

// ============================================================
// UNITS
// ============================================================

export async function getUnits() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('units')
    .select('*')
    .order('name');
  if (error) throw error;
  return data;
}

export async function createUnit(name: string, abbreviation: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('units')
    .insert({ name, abbreviation })
    .select()
    .single();
  if (error) throw error;
  revalidatePath('/settings/units');
  return data;
}

export async function deleteUnit(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from('units').delete().eq('id', id);
  if (error) throw error;
  revalidatePath('/settings/units');
}

// ============================================================
// WORK CATEGORIES
// ============================================================

export async function getCategories() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('work_categories')
    .select('*')
    .order('name');
  if (error) throw error;
  return data;
}

export async function createCategory(name: string, color: string, description?: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('work_categories')
    .insert({ name, color, description: description || null })
    .select()
    .single();
  if (error) throw error;
  revalidatePath('/library/categories');
  return data;
}

export async function updateCategory(id: string, updates: { name?: string; color?: string; description?: string }) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('work_categories')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  revalidatePath('/library/categories');
  return data;
}

export async function deleteCategory(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from('work_categories').delete().eq('id', id);
  if (error) throw error;
  revalidatePath('/library/categories');
}

// ============================================================
// WORK SUBCATEGORIES
// ============================================================

export async function getSubcategories(categoryId?: string) {
  const supabase = createClient();
  let query = supabase
    .from('work_subcategories')
    .select('*, work_categories(id, name, color)')
    .order('name');
  if (categoryId) query = query.eq('category_id', categoryId);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function createSubcategory(categoryId: string, name: string, description?: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('work_subcategories')
    .insert({ category_id: categoryId, name, description: description || null })
    .select()
    .single();
  if (error) throw error;
  revalidatePath('/library/categories');
  return data;
}

export async function deleteSubcategory(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from('work_subcategories').delete().eq('id', id);
  if (error) throw error;
  revalidatePath('/library/categories');
}

// ============================================================
// WORK ITEMS
// ============================================================

export async function getWorkItems(subcategoryId?: string, categoryId?: string) {
  const supabase = createClient();
  let query = supabase
    .from('work_items')
    .select(`
      *,
      units (id, name, abbreviation),
      work_subcategories (
        id, name, category_id,
        work_categories (id, name, color)
      )
    `)
    .order('description');

  if (subcategoryId) {
    query = query.eq('subcategory_id', subcategoryId);
  } else if (categoryId) {
    // Filter by category via subcategory join
    const { data: subs } = await supabase
      .from('work_subcategories')
      .select('id')
      .eq('category_id', categoryId);
    if (subs && subs.length > 0) {
      query = query.in('subcategory_id', subs.map(s => s.id));
    }
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getAllWorkItems() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('work_items')
    .select(`
      *,
      units (id, name, abbreviation),
      work_subcategories (
        id, name, category_id,
        work_categories (id, name, color)
      )
    `)
    .order('description');
  if (error) throw error;
  return data;
}

export async function createWorkItem(
  subcategoryId: string,
  description: string,
  unitId: string,
  rate: number
) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('work_items')
    .insert({ subcategory_id: subcategoryId, description, unit_id: unitId, rate })
    .select()
    .single();
  if (error) throw error;
  revalidatePath('/library/items');
  return data;
}

export async function updateWorkItem(
  id: string,
  updates: { description?: string; unit_id?: string; rate?: number; subcategory_id?: string }
) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('work_items')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  revalidatePath('/library/items');
  return data;
}

export async function deleteWorkItem(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from('work_items').delete().eq('id', id);
  if (error) throw error;
  revalidatePath('/library/items');
}
