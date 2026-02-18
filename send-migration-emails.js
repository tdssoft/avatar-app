import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Lista użytkowników z migracji
const migratedUsers = [
  { email: 'anna.ojdana@gmail.com', name: 'Anna Ojdana' },
  { email: 'kamil.niegowski@devs.personit.net', name: 'Kamil Niegowski' },
  { email: 'bartoszlasakk@gmail.com', name: 'Ireneusz Dudek' },
  { email: 'bartek833@gmail.com', name: 'Joe Doe' },
  { email: 'bartek833+1@gmail.com', name: 'Arthur Moe' },
  { email: 'wiriri2185@owlny.com', name: 'Karol Woźniak' },
  { email: 'yageva6942@shouxs.com', name: 'Andrzej Zając' },
  { email: 'wfv82922@bcooq.com', name: 'Urjasz Symanski' },
  { email: 'hiweb79819@owlny.com', name: 'Maciej Michalski' },
  { email: 'potepiy660@perceint.com', name: 'Brygida Piotrowska' },
  { email: 'lucyna.mieszek@gmail.com', name: 'Lucyna Mieszek' },
  { email: 'tesciarz1@gmail.com', name: 'Jan Kowalski' },
  { email: 'bartoszlasakk+99@gmail.com', name: 'Bartosz Lasak' },
  { email: 'bartoszlasakk+100@gmail.com', name: 'Bartosz Lasak' },
  { email: 'bartek833+5@gmail.com', name: 'Paweł Kowalski' },
  { email: 'bartek833+6@gmail.com', name: 'Sergio Canalez' },
  { email: 'lucyna.mieszek+1@gmail.com', name: 'Jan Mieszek' },
  { email: 'testnumber@testnumber.pl', name: 'TESTnumber TESTnumber' },
];

const emailTemplate = (name) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background: #f9fafb; }
    .button {
      display: inline-block;
      background: #4F46E5;
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      margin: 20px 0;
    }
    .password {
      background: #FEF3C7;
      padding: 15px;
      border-left: 4px solid #F59E0B;
      margin: 20px 0;
      font-size: 18px;
      font-weight: bold;
    }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Witamy w nowej wersji Avatar App!</h1>
    </div>

    <div class="content">
      <p>Cześć ${name}!</p>

      <p>Właśnie zakończyliśmy migrację Twojego konta do nowej, ulepszonej platformy Avatar App.</p>

      <h2>📋 Co się zmieniło?</h2>
      <ul>
        <li>✅ Twoje konto zostało przeniesione</li>
        <li>✅ Historia wiadomości z adminami zachowana</li>
        <li>✅ Notatki i polecenia zachowane</li>
        <li>⚠️ Musisz ustawić nowe hasło</li>
      </ul>

      <h2>🔑 Twoje tymczasowe hasło:</h2>
      <div class="password">
        MigratedUser123!
      </div>

      <p><strong>⚠️ WAŻNE:</strong> To hasło jest tymczasowe. Po pierwszym zalogowaniu <strong>natychmiast je zmień</strong>!</p>

      <h2>🚀 Jak się zalogować?</h2>
      <ol>
        <li>Przejdź na stronę: <a href="https://avatarapp.pl">avatarapp.pl</a></li>
        <li>Użyj swojego emaila: <strong>${migratedUsers.find(u => u.name === name)?.email}</strong></li>
        <li>Wpisz hasło: <strong>MigratedUser123!</strong></li>
        <li>Zmień hasło w ustawieniach profilu</li>
      </ol>

      <a href="https://avatarapp.pl/login" class="button">Zaloguj się teraz</a>

      <h2>📸 Co musisz zrobić po zalogowaniu?</h2>
      <ul>
        <li>🔐 Zmień hasło (PRIORYTET!)</li>
        <li>📷 Dodaj zdjęcie profilowe (nie zostało przeniesione)</li>
        <li>📄 Prześlij ponownie wyniki badań (jeśli miałeś)</li>
        <li>✍️ Sprawdź swoje dane w profilu</li>
      </ul>

      <p>Jeśli masz jakiekolwiek pytania lub problemy z logowaniem, skontaktuj się z nami!</p>

      <p>Pozdrawiamy,<br>Zespół Avatar App</p>
    </div>

    <div class="footer">
      <p>© 2026 Avatar App. Wszystkie prawa zastrzeżone.</p>
      <p>Jeśli nie rejestrowałeś się w Avatar App, zignoruj tę wiadomość.</p>
    </div>
  </div>
</body>
</html>
`;

async function sendMigrationEmails() {
  console.log('📧 Wysyłam emaile do użytkowników...\n');

  let sent = 0;
  let failed = 0;

  for (const user of migratedUsers) {
    try {
      await resend.emails.send({
        from: 'Avatar App <noreply@avatarapp.pl>',
        to: user.email,
        subject: '🎉 Twoje konto Avatar App zostało zmigrowane - nowe hasło w środku',
        html: emailTemplate(user.name),
      });

      console.log(`✅ Wysłano do: ${user.email}`);
      sent++;

      // Sleep to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {
      console.error(`❌ Błąd dla ${user.email}:`, error.message);
      failed++;
    }
  }

  console.log(`\n📊 Podsumowanie:`);
  console.log(`   ✅ Wysłano: ${sent}`);
  console.log(`   ❌ Niepowodzenia: ${failed}`);
  console.log(`   📧 Razem: ${migratedUsers.length}`);
}

// Uruchom wysyłkę
sendMigrationEmails().catch(console.error);
