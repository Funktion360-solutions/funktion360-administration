# Dashboardoverblik

Installér database/dashboard-overview.sql i Vores Kok CRM.

Dashboardet bruger faktiske optællinger i databasen. CRM-personer, organisationer, produkter og planer tælles som aktive poster. Favn360-overblikket viser udkast, afventende accept, afventende testbetaling, registrerede testbetalinger, betalingsopfølgning og aktive Stripe-testabonnementer. Supportoverblikket viser internt publicerede vejledninger og kladder.

Data begrænses af medarbejderens rettigheder. Manglende adgang vises særskilt fra nul. Valgfrie moduler uden databaseopsætning vises som ikke installeret, og stopper ikke resten af dashboardet. Betalte testtilbud og Stripe-testabonnementer betyder ikke aktiveret Favn360-adgang. Stripe-tal er baseret på seneste modtagne hændelser og er ikke en liveforespørgsel hos Stripe.

Alle handlinger er læsning. Der ændres ikke kundedata, betalinger eller rettigheder. Dashboardet opdateres ved genindlæsning.

Test: Åbn Dashboard og følg links til pipeline, betalingsopgaver og vidensbase. Kontrollér, at registreret testbetaling svarer til dit tilbud. DB-test kontrollerer adgang og aktiv personoptælling i en transaktion med rollback.
