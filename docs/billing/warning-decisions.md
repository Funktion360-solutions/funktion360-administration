# Testfrister og foreslået adgang

Samlepakken inkluderer testafsendelse fra forrige pakke samt ny beslutningsoversigt under Opgaver. SQL-filen opretter de manglende mailtabeller, hvis de ikke findes, og opdaterer kendte funktioner. Betalingsopgaver, varslingsudkast og betalerkontrol skal allerede være installeret.

Tilstande: faktura afsluttet; levering fejlet; afventer levering; frist løber; ny kontrol kræves; udløbet testfrist med kandidat til læsning og eksport.

Et forslag om begrænsning kræver bekræftet levering, mindst syv hele døgn, åbent restbeløb, uændret gyldig kobling, aktiv person/plan/organisation/betaler og faktura-/betalerkontrol højst 24 timer gammel. Kontrollen bruger tidspunktet fra databasen, ikke browserens ur. Ved manglende oplysninger foreslås ny kontrol. Læsning, eksport, betaling og support bevares i forslaget.

Dette er en læsevisning. Ingen rettigheder eller konti ændres. Status beregnes ved genindlæsning; der er ingen baggrundsopgave eller automatisk håndhævelse. Betalt eller annulleret faktura ophæver forslag om varslingsbegrænsning.

Mailopsætningen er beskrevet i payment-warning-mail.md. Bevar alle eksisterende Stripe-hændelser og support-webhooks. For testafsendelse: opret særskilt Resend-webhook /api/webhooks/payment-warnings, sæt RESEND_WARNING_WEBHOOK_SECRET samt F360_WARNING_TEST_SEND=true og redeploy. Hvis opsætningen mangler, kan beslutningsoversigten stadig installeres, men der kan ikke sendes testmail eller bekræftes nye leveringer.

Tests dækker syv døgn inklusive grænsen, betalt faktura, leveringsfejl, ændret kobling og forældede Stripe-oplysninger. Databasetest køres samlet med rollback; eksisterende kundedata bevares.
