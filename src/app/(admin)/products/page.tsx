import Link from 'next/link';
import {requireStaff} from '@/lib/auth/require-staff';
import {ProductsSection} from '@/components/products-section';
import styles from './catalog.module.css';
export const dynamic='force-dynamic';
export default async function ProductsPage(){await requireStaff();return <div className={styles.workspace}><p className="font-mono text-xs uppercase tracking-widest text-black/40">Funktion360 · Produktadministration</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Produktkatalog</h1><p>Fælles katalog for administrationens kunder og produkttildelinger.</p><Link href="/products/plans">Administrér planer og abonnementspriser →</Link><div className="mt-5 rounded-xl border border-black/10 bg-[#f8f8f4] p-5 text-sm text-black/60">Indhold, målgrupper, CTA’er og prisvisning på den offentlige produktside administreres fortsat i den eksisterende produkteditor. Dette katalog styrer CRM-produkterne; publicering på firmaside og betaling er separate forbindelser.</div><ProductsSection/></div>;}
