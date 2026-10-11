# Supportdesign og vedhaeftninger

Denne opdatering bygger paa supportindbakken og Resend-integrationen.

## Maildesign

Nye udgaaende mails sendes med en Funktion360 HTML-skabelon og den originale
tekst som alternativ. Skabelonen bruger inline CSS og praesentationstabeller,
sa den ogsaa kan vises af mailprogrammer, der fjerner stylesheets.

Skriv dit svar med almindelige afsnit og linjeskift. Klik **Se mailens udseende**
foer afsendelse. Signaturen tilfoejes automatisk. HTML fra brugeren fortolkes
ikke; alle tekstfelter escapes. Modtagne mails vises fortsat som sikker tekst.

Den faerdige HTML gemmes som et uforanderligt snapshot i CRM-outboxen ved
klargoering. Genforsoeg bruger samme indhold og idempotency-noegle. Gamle mails
uden HTML bruger fortsat deres oprindelige tekstpayload. Skabelonen kan aendres
senere uden at aendre allerede klargjorte mails.

## Vedhaeftninger

Aabn en mail i **Support > Indbakke** og klik **Vis filer**.
Filnavne, stoerrelse og en downloadknap vises. Hvert API-kald kontrollerer aktiv
medarbejder, support.read, MFA-politikken og adgang via det lokale inbox-ID.
Browseren kan ikke vaelge et vilkaarligt Resend-mail-ID eller en downloadadresse.

Download er begraenset til 4.000.000 bytes pr. fil for at holde sig under Vercels
payloadgraense. Stoerre filer kan hentes i Resend. API-noegler og midlertidige
provider-downloadadresser forbliver paa serveren. Filer leveres som download,
ikke som inline HTML. Svaret er private/no-store og nosniff. Providerfejl og
ufuldstaendige downloads vises i indbakken.

Filerne opbevares fortsat hos Resend; denne opdatering opretter ikke et permanent
filarkiv. Overfoersel af vedhaeftninger i udgaaende mails er ikke med i denne etape.

## Database og installation

Kun crm.support_email_outbox faar et ekstra nullable html_body-felt. Eksisterende
RPC-signatur, rettigheder og MFA-kontrol bevares. Ingen Vores Kok-tabeller aendres.
Migrationen support_mail_html_snapshot er allerede anvendt paa det faelles
Supabase-projekt tgqwyheqhquwncyloond. Koer ikke et generelt supabase db push.
Ingen nye servervariabler eller pakker kraeves.

## Kontrol

- node --test tests/support-attachments.test.mjs tests/support-email-template.test.mjs tests/support-mail.test.mjs tests/support-inbox.test.mjs
- npm run lint
- npm run build
- supabase/tests/support-mail-html.sql koeres i en transaction med rollback.

Efter deployment: send en testmail med en lille PDF eller et billede til
support@indbakke.funktion360.dk. Hent filen fra indbakken. Send et svar fra en
supportsag, kontroller preview og se HTML-mailen i dit eget mailprogram.
Udseendet kan variere mellem Outlook, Gmail og andre mailprogrammer.

## Maildesign v2 og Support-ID

Ny Funktion360-skabelon med mørkeblå top, mintfarvet accent og en særskilt
fodnote. Det faktiske sagsnummer hentes fra supportsagen og vises i top og bund,
selv hvis mailens emne ændres. Preview viser samme sagsnummer.

Hvis en NY mail kommer tilbage fra outboxen uden HTML, stopper afsendelsen med
en tydelig fejl i stedet for automatisk at sende standardtekst. Gamle genforsøg
beholder deres oprindelige payload. Vent på at den nye Vercel-deployment er Ready,
brug 'Se mailens udseende', og send en NY testmail efter opdateringen.
