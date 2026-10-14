import {AgreementOverview} from '@/components/customer-360/agreement-overview';
export const dynamic='force-dynamic';
export default async function Page({params,searchParams}:{params:Promise<{id:string}>,searchParams:Promise<{q?:string,status?:string}>}){const [{id},filters]=await Promise.all([params,searchParams]);return <div className="space-y-6"><h2 className="text-2xl font-semibold">Kontrakter</h2><AgreementOverview kind="contracts" organizationId={id} query={typeof filters.q==='string'?filters.q:''} status={typeof filters.status==='string'?filters.status:''} locked/></div>;}
