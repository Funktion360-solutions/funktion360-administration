import Link from 'next/link';
import {requireStaff} from '@/lib/auth/require-staff';
import {ProductPlansSection} from '@/components/product-plans-section';
import {ProductPlanPricesSection} from '@/components/product-plan-prices-section';
import styles from '../catalog.module.css';
export const dynamic='force-dynamic';
export default async function PlansPage(){await requireStaff();return <div className={styles.workspace}><Link href="/products">← Produktkatalog</Link><p className="font-mono text-xs uppercase tracking-widest text-black/40">Funktion360 · Kommercielle planer</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Planer og priser</h1><p>Vedligehold eksisterende CRM-planer, prisposter og Stripe Price-ID’er.</p><div className="mt-5 rounded-xl border border-black/10 bg-[#f8f8f4] p-5 text-sm text-black/60">Favn360 er foreløbig det eneste betalingsprodukt. Gemte prisposter opretter ikke automatisk priser i Stripe, og aktivering af et abonnement efter betaling er endnu ikke koblet på.</div><ProductPlansSection/><ProductPlanPricesSection/></div>;}
