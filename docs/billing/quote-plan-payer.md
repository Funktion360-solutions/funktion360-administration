# Plan, betaler og organisation på accepterede Favn360-tilbud

Installér database/quote-commercial-assignment.sql i Vores Kok CRM. Åbn et accepteret tilbud under Salg → Tilbud. Sektionen Plan, betaler og organisation viser den gemte kobling.

Vælg aktiv Favn360-plan fra CRM, eventuel eksisterende organisation som mål for adgangen og præcis én betaler: person eller organisation. Personen, som accepterede tilbuddet, bevares som kontakt på tilbuddet. En anden betaler er tilladt. Betaleren skal have registreret email og være aktiv. En manglende organisation oprettes via Kunder → Organisationer før tilknytning.

Koblingen er administrativ. Der skrives ikke til Stripe Customer, abonnementets priser, fakturaer, Funktion360 ID eller produktadgang. Priserne i det accepterede tilbud bevares; valg af en plan ændrer ikke Stripe-beløbet. Eventuelle aftalte særpriser skal forklares i begrundelsen. Organisationstilknytningen er ikke bevis for brugerens medlemskab eller adgangsrettigheder.

Læserettigheder: quotes.read, people.read, licenses.read, organizations.read. Skriverettigheder: quotes.manage, licenses.manage, people.read, organizations.read samt eksisterende politik for kritiske MFA-handlinger. Ændringer gemmes med valgt betaler, snapshot af navn/email, medarbejder og begrundelse. Auditloggen indeholder nye og tidligere koblings-ID'er. Identisk genforsøg giver ikke en ekstra auditpost.

Test: Åbn accepteret testtilbud, vælg den aftalte plan og betaler, bekræft kontrollen og gem. Genindlæs og kontrollér værdierne. Ret koblingen med ny begrundelse og kontrollér den nye auditpost. Ingen nye betalinger eller mails sendes af denne pakke.

Næste trin er afstemning mod Stripe-betaler og betalingsvarsling; varsler må ikke sendes til denne valgte email alene uden kontrol af den korrekte betalingsrelation.
