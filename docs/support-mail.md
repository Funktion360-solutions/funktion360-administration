# Kundeservice og Resend – første etape

Supportsager bruger den eksisterende CRM i `crm` på projektet tgqwyheqhquwncyloond.
Migrationen ændrer kun CRM-mailtabellen og tilføjer afgrænsede RPC-funktioner.
Migration `20261011103930_support_email_resend.sql` er anvendt på det fælles projekt den 11. oktober 2026.
Der skal ikke køres en samlet `supabase db push` på dette delte projekt.

## Serveropsætning

Tilføj i administrationsprojektets servermiljø, fx Vercel Production:

```
RESEND_API_KEY=re_...
SUPPORT_MAIL_FROM=Funktion360 Support <support@funktion360.dk>
SUPPORT_MAIL_REPLY_TO=support@funktion360.dk
```

Afsenderdomænet skal være verificeret i Resend. Reply-To skal være en eksisterende,
overvåget mailadresse. Ingen af disse værdier må have NEXT_PUBLIC-præfiks.
Genudrul administrationen efter ændringer. Del aldrig API-nøglen i chat eller git.

## Brug

Åbn Support → Supportsager. Opret en sag for en eksisterende CRM-person, åbn sagen,
og kontrollér modtageradresse, emne og besked før Send mail til kunden.
`support.read` viser sager; `support.manage` opretter; `support.respond` sender;
`support.internal_notes` giver interne noter. Eksisterende MFA-politik håndhæves
også i mail-RPC'en. Noter sendes aldrig.

Hver mail får et holdbart outbox-ID før netværkskaldet. Resend modtager samme
idempotensnøgle ved genforsøg. Knappen på den eksisterende mail kan bruges i
23 timer, under Resends 24-timers vindue. Opret ikke en ny kopi af en ubekræftet
mail. Efter udløb kontrollér Resends dashboard manuelt.

“Accepteret af Resend” betyder accepteret af udbyderen, ikke leveret eller læst.
Leveringswebhooks, indgående mails, vedhæftninger og automatisk sagsmatchning er
næste etape. Indtil da modtages svar på den overvågede Reply-To-adresse uden
automatisk import. Opsæt et særskilt modtagesubdomæne til fremtidig indgående
Resend-post; udskift ikke hoveddomænets eksisterende MX-poster.

## Kontrol

`npm run lint`, `npx tsc --noEmit`, `npm run build`.
SQL-migrationen skal testes i en rollback-transaktion før anvendelse.
Ingen faktiske kundemails må sendes under automatiske tests.

Sikkerhedskontrollen finder ingen nye advarsler på WARN/ERROR-niveau.
Outbox-tabellen har med vilje RLS uden læse-/skrivepolitik og uden direkte grants;
adgang sker kun via medarbejdervalideret RPC. Derfor ses en INFO om RLS uden politik:
https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy
