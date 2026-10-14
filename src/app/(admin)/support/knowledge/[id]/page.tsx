import Link from 'next/link';
import {notFound} from 'next/navigation';
import {requirePermission} from '@/lib/auth/require-permission';
import {createClient} from '@/lib/supabase/server';
import {KnowledgeForm,knowledgeCategories,knowledgeStatuses,type Article} from '@/components/knowledge-form';
export const dynamic='force-dynamic';
export default async function KnowledgeArticle({params,searchParams}:{params:Promise<{id:string}>,searchParams:Promise<{notice?:string}>}){
 await requirePermission('support.read');const {id}=await params;if(!/^[0-9a-f-]{36}$/i.test(id))notFound();const db=await createClient();const [result,manage,products]=await Promise.all([db.rpc('get_crm_knowledge',{p_id:id}),db.rpc('current_user_has_permission',{required_permission:'support.manage'}),db.rpc('list_crm_products')]);const {notice}=await searchParams;
 if(result.error)return <p role="status">Vejledningen kunne ikke hentes. Kontrollér databaseopsætning og rettigheder.</p>;if(!result.data)notFound();const article=result.data as Article;const options=((products.data || []) as Array<{id:string,name:string,status:string}>).filter(p=>p.status==='active');
 return <div className="space-y-6"><Link className="underline" href="/support/knowledge">← Vidensbase</Link><header><p className="text-xs uppercase tracking-widest text-black/40">{knowledgeCategories[article.category]} · {article.product_name || 'Generelt'} · {knowledgeStatuses[article.status]}</p><h1 className="mt-3 text-3xl font-semibold">{article.title}</h1><p className="mt-4 whitespace-pre-wrap text-sm text-black/60">{article.summary}</p></header>{notice==='saved'?<p role="status" className="rounded-xl bg-[#f0f2eb] p-5 text-sm">Vejledningen er gemt.</p>:null}<article className="rounded-2xl border border-black/10 bg-white p-6"><p className="whitespace-pre-wrap break-words leading-7">{article.body}</p></article>{manage.data===true?<details className="rounded-2xl border border-black/10 bg-white p-6"><summary className="cursor-pointer font-semibold">Rediger vejledning</summary><KnowledgeForm id={id} article={article} products={options}/></details>:null}</div>;
}
