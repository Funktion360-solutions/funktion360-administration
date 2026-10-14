# Stripe-testabonnementets status

Kør database/stripe-test-subscriptions.sql efter person-quote-payments.sql i CRM-projektet.

Tilføj disse Snapshot-hændelser på den eksisterende Stripe-testwebhook (bevar checkout.session.completed):
- customer.subscription.created
- customer.subscription.updated
- customer.subscription.deleted
- customer.subscription.paused
- customer.subscription.resumed

Webhook og signing secret er de samme. Genlæsning af abonnementet hos Stripe er autoritativ. Kun testabonnementer mærket f360_mode=test og koblet til en kendt testcheckout kan synkroniseres. Ukendt checkout returnerer 500 for genforsøg, hvis abonnementshændelsen kommer før checkoutbekræftelsen. Ældre event-tidspunkter ignoreres, og identiske statusser giver ikke flere auditposter.

Personprofil og /subscriptions viser Stripe-status, planlagt opsigelse og den tidligste periodeslutning blandt abonnementets prislinjer. Periodens slutdato er ikke en bekræftelse på fakturabetaling. Der ændres ingen produktadgang, og der sendes ingen kundevarsler fra denne pakke.

Eksisterende testabonnementer indlæses ved næste abonnementshændelse eller genlevering af checkout.session.completed. Stripe-dashboardets eventleveringer kan genleveres efter installationen.

Test i Stripe sandbox: Åbn det oprettede testabonnement og planlæg opsigelse ved periodeslut. Kontrollér, at webhooken returnerer 200, og at administrationen viser planlagt opsigelse med dato. Fjern den planlagte opsigelse igen og kontrollér status. En faktisk opsigelse registreres som canceled; ingen organisationsdata slettes.

Kundevarsling (7 dage før begrænsning), fakturahistorik ved fornyelse, betalingsfejl på fakturaniveau og Favn360-aktivering er kommende arbejde. Et aktivt Stripe-testabonnement betyder ikke aktiv produktadgang.
