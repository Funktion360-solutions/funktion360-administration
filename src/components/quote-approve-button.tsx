'use client';
import {useFormStatus} from 'react-dom';
export function QuoteApproveButton({label="Godkend tilbud",pendingLabel="Godkender…"}:{label?:string,pendingLabel?:string}={}){const {pending}=useFormStatus();return <button disabled={pending} aria-busy={pending} className="rounded-xl bg-[#202120] px-5 py-3 text-sm text-white disabled:opacity-60">{pending?pendingLabel:label}</button>;}
