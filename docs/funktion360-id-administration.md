# Administration er skriveansvarlig for organisationer

Beslutning: teamet opretter og vedligeholder CRM-organisationer og brugerrelationer i administration.funktion360.dk. ID er læseflade for organisationsmedlemskaber; ingen selvbetjent oprettelse. CRM-kontaktroller (jobtitel/billing_contact mv.) er ikke adgangsroller.

Første implementering: Customer 360 → Funktion360 ID viser personer fra get_crm_organization_people og identiteter fra get_crm_person_external_identities. system=funktion360_id er den reserverede centrale identitetstype. En CRM-registrering vises som registreret, ikke verificeret i ID. Der er ingen nye skrivehandlinger eller synkronisering i denne pakke.

Integrationens næste kontrakt:
- CRM-organisation-ID er stabil kilde-ID; centralt ID-organisation-ID er separat og mappes eksplicit.
- CRM-person knyttes til (issuer, subject), hvor issuer er det dedikerede ID-projekt. Email alene må aldrig give identitets- eller medlemskabsrettigheder.
- Staff-permission for ID-medlemskabsændringer skal være særskilt fra almindelige CRM-kontaktopdateringer.
- Afgrænset server-til-server skrivekanal skal verificere medarbejderens aktuelle status/permission og audit-logge actor, target, operation og resultat. Ingen centrale privilegier i browseren.
- Outbox med event-ID og versionsnummer gør ændringer idempotente og genforsøgelige. Stale events må ikke genaktivere fjernede medlemskaber. ID-projektion opdateres transaktionelt; seneste ejer beskyttes.
- Suspendering/fjernelse af medlemskab skal vises på ID og vurderes separat i produkternes RLS. CRM-status alene er ikke produktadgang.

Eksisterende Favn360-identity-sync må ikke genbruges blindt til autorisation. Bevar separate autentificeringsprojekter; genbrug ikke staff_users.auth_user_id som centralt subject.

Ingen central forbindelse er etableret endnu. Serverkanal, mappings, outbox og databaseændringer skal implementeres og verificeres før UI får knapper til at give/fjerne adgang.
