'use client';
import {useFormStatus} from 'react-dom';
export function QuoteApproveButton(){const {pending}=useFormStatus();return <button disabled={pending} aria-busy={pending} className="rounded-xl bg-[#202120] px-5 py-3 text-sm text-white disabled:opacity-60">{pending?'Godkender…':'Godkend tilbud'}</button>;}
