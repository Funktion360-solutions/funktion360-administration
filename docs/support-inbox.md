# Indbakke, kundesvar og leveringsstatus

Indbakken er `/support/inbox`. CRM-migration `20261011111822_support_inbox.sql`
er anvendt på det fælles Supabase-projekt. Kør ikke samlet `db push`.

## Aktivering

1. Installér opdateringen og kør `npm install`. Udgiv administrationen.
2. Kør installationsfilen med `--setup-token` fra administrationsrepositoryet.
   Den opretter `.env.support-inbox.local` med en tilfældig nøgle og
   `.env.support-inbox-setup.sql` med nøglens SHA256-hash. Begge er git-ignoreret.
   Gentagen kørsel genbruger nøglen. SQL-filen indeholder kun hashværdien.
3. Åbn SQL-filen lokalt, og kør dens indhold i Supabase SQL Editor på projektet
   `tgqwyheqhquwncyloond`. Kopiér tokenværdien fra den lokale env-fil til
   Vercel-variablen `SUPPORT_MAIL_INGEST_TOKEN` for administrationen.
4. Opret en webhook i Resend:
   `https://administration.funktion360.dk/api/webhooks/resend`
   Vælg `email.received`, `email.sent`, `email.delivered`,
   `email.delivery_delayed`, `email.bounced`, `email.failed`,
   `email.complained` og `email.suppressed`.
5. Gem webhookens `whsec_...` som servervariablen `RESEND_WEBHOOK_SECRET`.
   `RESEND_API_KEY` skal have adgang til at hente modtagne mails (Full access),
   ikke kun sending access. Behold nøglerne på serveren; aldrig NEXT_PUBLIC.
6. Genudrul administrationen. Lad `SUPPORT_MAIL_INBOUND_ENABLED` være fraværende
   eller `false` under første kontrol. Send en testmail til
   `support@indbakke.funktion360.dk`; se den i Support → Indbakke.
7. Efter testen sættes `SUPPORT_MAIL_INBOUND_ENABLED=true` og
   `SUPPORT_MAIL_REPLY_TO=support@indbakke.funktion360.dk`. Genudrul.
   Nye mails fra supportsager får en unik `support+...@indbakke.funktion360.dk`
   svaradresse. Ældre mails/genforsøg beholder deres oprindelige svaradresse.

Modtagelsessubdomænet skal vise Verified i Resend. Hoveddomænets MX skal fortsat
pege på Simply; `aksel@funktion360.dk` er ikke koblet til denne indbakke.
Hvis Vercel Deployment Protection blokerer webhooks, skal produktionsendpointet
have adgang for Resend. Undgå at bruge et beskyttet preview som webhookadresse.

## Sådan bruges indbakken

Nye henvendelser vises uden automatisk oprettelse af kontakter. Vælg en eksisterende
CRM-person og opret en sag, eller knyt mailen til en eksisterende personbaseret sag.
Mail og event-ID bruges til deduplikering. Ukendte eller ubekræftede afsendere
forbliver i den manuelle indbakke. Automatisk match kræver unik svaradresse,
en tidligere accepteret udgående mail til samme afsender samt DKIM eller DMARC
bestået ifølge Resends modtagelsesserver. Match foretages ikke ud fra emnelinjen.

`support.read` læser mails. `support.manage` fordeler og arkiverer henvendelser.
`support.respond` sender svar. Den eksisterende MFA-politik håndhæves.

Mailindhold vises som tekst, uden aktive HTML-elementer eller eksterne billeder.
Der gemmes op til 100.000 teksttegn; indbakkeoversigten viser seneste 200 pr. status.
Vedhæftninger tælles, men filvisning og downloads er ikke implementeret endnu;
brug Resends receiving-oversigt til filer. Leveret betyder afleveret til kundens
mailserver, ikke læst. Webhooken sender ingen automatisk svarmail.

## Drift og sikkerhed

Webhooken verificerer den originale rå payload med Svix, inklusive tidsstempel.
Fejl giver 503, så Resend kan forsøge igen. Tilbagevendende fejl bør undersøges i
Vercel og Resends webhookoversigt og kan genafspilles efter opsætningen er rettet.
Der logges ikke mailtekst, nøgler eller provider-downloadadresser.

Webhooken bruger publishable Supabase-nøglen plus et separat ingest-token.
Tokenet tillader kun afgrænset mail/event-ingestion, aldrig kundelæsning eller
vilkårlige databaseændringer. Kun SHA256-hashen gemmes i databasen.
CRM-tabellerne har RLS og ingen direkte klientgrants. RLS uden politik giver med
vilje INFO i advisors: https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy
Ingen nye WARN/ERROR blev registreret ved denne migration.

## Kontrol

`node --test tests/support-mail.test.mjs tests/support-inbox.test.mjs`
`npx tsc --noEmit`, `npm run lint`, `npm run build`.
SQL-testen køres i rollback-transaktion med migrationen; ingen faktiske mails sendes.
Slutkontrol i produktion kræver ovenstående servernøgler og en testmail fra brugeren.
