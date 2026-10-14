# Testafsendelse og leveringsbekræftelse

Installér database/payment-warning-mail.sql efter payment-warning-drafts.sql i CRM-projektet.

Opret en separat webhook i Resend (bevar eksisterende support-webhook):
https://administration.funktion360.dk/api/webhooks/payment-warnings

Hændelser: email.delivered, email.bounced, email.failed, email.complained, email.suppressed.

Sæt RESEND_WARNING_WEBHOOK_SECRET til den nye webhooks signing secret. Sæt F360_WARNING_TEST_SEND=true for eksplicit at tillade testafsendelse. Bevar RESEND_API_KEY, SUPPORT_MAIL_FROM, SUPPORT_MAIL_REPLY_TO, SUPABASE_SECRET_KEY og Stripe-testopsætningen. Redeploy efter miljøændringer.

Opgaver → Varslingsudkast har en sendeknap til aktuel faktura med betalingsproblem, valgt betaler og frisk kontrol. Medarbejderen bekræfter gennemgangen. Stripe genlæses før afsendelse; fakturastatus, restbeløb, abonnement og aktuel kundemail skal stemme. Mailen mærkes TEST og indledes med, at ingen produktadgang ændres. Dette er ikke et produktionsvarsel.

Indhold, sender og reply-to gemmes som en fast snapshot. Genforsøg bruger samme Resend-idempotency key. Efter 23 timer stoppes ubekræftede genforsøg; afklar hos udbyderen frem for at oprette en ny mail.

Mailudbyderens accepterede afsendelse starter ingen frist. En signaturverificeret email.delivered starter en testfrist på syv dage fra modtagelse af leveringsbekræftelsen. Det beviser levering hos modtagerens mailserver, ikke at et menneske har læst mailen. Bounce, fejl, spamklage eller suppression fjerner den aktive testfrist. Gentagne callbacks flytter ikke fristen. Callback før gemt mail-ID opbevares og afstemmes, når mail-ID er registreret.

Der ændres ingen Favn360-, ID- eller Stripe-rettigheder. En betalt faktura gør udkastet forældet; en historisk registreret testfrist kan stadig vises som dokumentation. Fristen er ikke en instruks om at begrænse adgang.

Test kræver en faktisk synkroniseret Stripe-testfaktura med betalingsproblem og en gennemgået modtager. Den eksisterende betalte testfaktura er ikke egnet. Kontroller sendt → leveret → testfrist under Opgaver og webhookens 200-svar. Databasetests er kørt med rollback, så ingen mails eller testkundedata blev efterladt.
