# Stripe-testbetaling for accepterede tilbud

Kun testtilstand. Ingen produktadgang, organisationsoprettelse eller ID-oprettelse sker ved testbetaling.

## Installation

Kør database/quote-stripe-test.sql efter quote-payment-queue.sql i CRM-projektet (Vores Kok). Installer dependencies fra package-lock.json.

I administrationsprojektets Vercel-miljø:

- STRIPE_SECRET_KEY: Stripe sandbox/test secret (sk_test_ eller rk_test_ med nødvendige Checkout/read rettigheder).
- STRIPE_WEBHOOK_SECRET: whsec_ fra netop test-endpointet nedenfor.
- F360_STRIPE_TEST_CHECKOUT: true (eksplicit aktivering).
- SUPABASE_SECRET_KEY: eksisterende CRM-servernøgle.

Bevar eksisterende Supabase- og mailopsætning. Ingen hemmeligheder med NEXT_PUBLIC_-præfiks.

Registrér i Stripe sandbox/test en webhookdestination:
https://administration.funktion360.dk/api/webhooks/stripe

Vælg checkout.session.completed. Sæt endpointets signing secret som STRIPE_WEBHOOK_SECRET og redeploy. Webhooken kræver korrekt signatur og afviser live-events; den genlæser sessionen hos Stripe før registrering.

## Pilotens omfang

Tilbuddet skal være internt godkendt, gyldigt og accepteret af en aktiv kunde med emailbekræftelse. Der understøttes priser inklusive moms, én fælles månedlig eller årlig periode samt engangsbeløb. Kun engangsbeløb bruger payment mode; tilbagevendende prislinjer bruger subscription mode. Engangsbeløb er kun på første faktura. Højst 20 linjer af hver type. Første total skal være positiv og højst 999.999,99 DKK.

Eksklusive moms, særskilte perioder og blandet måned/år afvises. Ingen automatisk momsberegning, rabatkoder eller priser fra browseren. Dette er en test af betalingsforløbet, ikke en færdig produkt-/plankobling.

Én betalingssession pr. tilbud. Genforsøg bruger samme idempotency key og session. Efter udløb eller 23 timers usikker afsendelse stoppes genforsøg; afklar sessionen i Stripe, før et nyt tilbud oprettes. Udskift ikke Stripe-konto under et igangværende forsøg. En betalt test må ikke forsøges betalt igen.

Webhooks registrerer første testbetaling og eventuelt Stripe-subscription-ID. Fornyelser, opsigelse, refunderinger, betalingsadvarsler og aktivering er kommende arbejde. Testbetaling må ikke vises som aktiv Favn360-adgang.

## Test

Opret et lille tilbud med en månedlig pris inklusive moms. Godkend, send og accepter det. Åbn Stripe-testbetaling; brug Stripes testkort 4242 4242 4242 4242 med fremtidig udløbsdato og vilkårlig trecifret CVC. Vent på webhook og opdatér tilbudssiden. /billing skal vise Testbetaling registreret og stadig oplyse, at Favn360 ikke er aktiveret.

Kør node --test tests/*.test.mjs, npm run lint og npm run build. Databasetesten foretages i en transaktion med rollback; ingen reelle betalinger udføres af disse tests.
