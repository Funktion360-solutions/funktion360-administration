export type PipelineStage='draft'|'approved'|'accepted'|'test_paid'|'expired';
export function quoteStage(row:{status:string,accepted_at:string|null,test_paid_at:string|null,expired:boolean}):PipelineStage{
 if(row.test_paid_at)return 'test_paid';
 if(row.accepted_at)return 'accepted';
 if(row.expired)return 'expired';
 return row.status==='approved'?'approved':'draft';
}
