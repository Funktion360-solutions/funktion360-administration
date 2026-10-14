# Intern vidensbase

Installér database/knowledge-articles.sql i Vores Kok CRM. Sider: /support/knowledge og /support/knowledge/[id].

Medarbejdere med support.read kan læse internt publicerede vejledninger. support.manage giver adgang til kladder og arkiv samt redigering. Skrivehandlinger følger den eksisterende MFA-politik for kritiske handlinger. Anonyme brugere har ingen adgang. Publiceret betyder kun internt; intet publiceres på produkternes offentlige hjemmesider.

Kategorier: konto/login, produkter, abonnement/betaling, support og teknik. Vejledninger kan knyttes til et aktivt produkt eller være generelle. Valg fra kataloget følger eksisterende rettigheder til produktlisten. En eksisterende produktkobling bevares ved redigering, også hvis produktet senere bliver inaktivt.

Indhold gemmes og vises som almindelig tekst med afsnit bevaret. HTML udføres ikke. Titel maks. 200 tegn, beskrivelse maks. 1000, tekst maks. 50000. Søgningen omfatter titel, beskrivelse og tekst; der vises højst 200 resultater. Arkivering bevarer indholdet. Auditloggen registrerer medarbejder, artikel og statusændring; den indeholder ikke hele vejledningsteksten.

Test: Opret en kladde, publicér internt, søg efter en sætning fra teksten, redigér og arkivér. Identisk genforsøg af gemmehandlingen opretter ikke en ekstra artikel eller auditpost. Databasetest gennemføres med rollback uden at efterlade artikler.
