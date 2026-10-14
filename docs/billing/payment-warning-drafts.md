# Betalingsvarslingsudkast

Installér database/payment-warning-drafts.sql efter quote-payer-check.sql og payment-followups.sql i CRM-projektet.

På Opgaver kan medarbejderen klargøre et udkast for en testfaktura med restbeløb og betalingsproblem. Der kræves valgt betaler, uændret kobling og matchende Stripe-kundeemail kontrolleret inden for 24 timer. Payerens CRM-email skal stadig svare til snapshot og posten skal være aktiv.

Udkast gemmer modtager, restbeløb, tekst, begrundelse og medarbejder. Samme faktura, koblingsversion og restbeløb genbruger det eksisterende udkast. Betaling eller ændret kobling gør et tidligere udkast forældet.

Dette er et tekstudkast til intern gennemgang, ikke en udsendt email eller et gennemført varsel. Der er ingen sendeknap, deadline, adgangsbegrænsning eller automatisk kundevarsling. Ingen juridiske standardvilkår er installeret. Før afsendelse skal faktura og korrekt betalingsrelation kontrolleres hos Stripe igen; et historisk emailmatch er ikke bevis for adgang eller betalingsfuldmagt.

Rettigheder og kritisk MFA følger plan/betaler-modulet. Test gennemført med midlertidig faktura og rollback: udkast på betalingsproblem, idempotent genforsøg, blokering ved betaling og blokering ved ændret betalerkontrol. Der ligger ingen testkunde eller testvarsel tilbage i databasen.

Den eksisterende betalte testfaktura skal ikke vise en knap under betalingsopgaverne. Køen viser kun faktiske synkroniserede betalingsproblemer.
