'use server';
import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {requirePermission} from '@/lib/auth/require-permission';
import {requireStaffMfa} from '@/lib/auth/require-staff-mfa';
import {createClient} from '@/lib/supabase/server';
export async function approveQuote(form:FormData){await requirePermission('quotes.approve');await requirePermission('people.read');await requireStaffMfa();const id=String(form.get('quote_id') || '');if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))redirect('/sales/quotes');const path='/sales/quotes/'+id;if(form.get('confirm')!=='yes')redirect(path+'?notice=confirm');const db=await createClient();const {error}=await db.rpc('approve_crm_quote',{p_id:id});revalidatePath(path);revalidatePath('/sales/quotes');redirect(path+'?notice='+(error?'failed':'approved'));}
