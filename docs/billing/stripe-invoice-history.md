# Stripe-testfakturahistorik

Kør database/stripe-test-invoices.sql efter stripe-test-subscriptions.sql i CRM-projektet.

Tilføj Snapshot-hændelser på eksisterende testwebhook, og bevar alle tidligere abonnementshændelser:
- invoice.paid
- invoice.payment_failed
- invoice.payment_action_required
- invoice.voided
- invoice.marked_uncollectible

Webhook genlæser faktura og abonnement hos Stripe. Livefakturaer, anden valuta end DKK og abonnementer uden f360_mode=test ignoreres. Kun abonnementer koblet til en testcheckout registreres. Historikken synkroniseres pr. faktura; gentagne beskeder opretter ikke flere fakturaer. Ældre event-tidspunkter overskriver ikke nyere status.

Fakturering (/billing) og personprofil viser status, beløb til betaling, betalt beløb, restbeløb og antal forsøg. Opstarts- og fornyelsesfakturaer mærkes særskilt. Stripe-fakturaens paid-status betyder betalt hos Stripe; betalt beløb kan være 0 ved nulbeløbsfakturaer. En invoice.paid-hændelse kan også følge manuel markering af fakturaen som betalt hos Stripe.

Ingen produktrettigheder, organisationsdata eller ID-brugere ændres. Ingen mails sendes af denne pakke. Refunderinger/kreditnotaer og automatisk varsling er næste arbejde. Et åbent restbeløb udløser ikke automatisk begrænsning.

Eksisterende historik indlæses ved genlevering af invoice.paid fra Stripe-testwebhook eller genlevering af checkout.session.completed (opstartsfakturaen). Dette importerer ikke automatisk alle ældre fakturaer.

Test efter deployment: Genlever invoice.paid for den eksisterende testbetaling og kontrollér historik på personprofil og Fakturering. Genlever samme hændelse igen og kontrollér, at fakturaen kun vises én gang. Fremtidige testfornyelser sendes til samme webhook.
