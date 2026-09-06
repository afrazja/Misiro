/** Original pilot items, separate from lesson exercises. Keys stay on the server.
 * Keep published v1 content fixed; content changes need a new protocol and migration.
 * Forms follow the same blueprint but have NOT been psychometrically equated. */
export interface CheckItem { skill: 'listening' | 'reading'; text: string; question: string; questionFa: string; options: string[]; answer: number; }
const item = (skill: CheckItem['skill'], text: string, question: string, questionFa: string, options: string[], answer: number): CheckItem => ({ skill, text, question, questionFa, options, answer });
export const CHECK_FORMS: Record<'a' | 'b', CheckItem[]> = {
  a: [
    item('listening','Der Zug nach Bonn fährt heute von Gleis vier ab.','Which platform does the train leave from?','قطار از کدام سکو حرکت می‌کند؟',['2','4','7'],1),
    item('listening','Ich hätte gern einen Tee, aber bitte ohne Zucker.','What does the customer want?','مشتری چه می‌خواهد؟',['Tee mit Zucker','Kaffee ohne Zucker','Tee ohne Zucker'],2),
    item('listening','Unsere Praxis öffnet am Donnerstag erst um zehn Uhr.','When does the practice open on Thursday?','مطب روز پنجشنبه چه ساعتی باز می‌شود؟',['10:00','08:00','12:00'],0),
    item('listening','Meine Schwester wohnt in Bremen. Ich besuche sie jeden zweiten Samstag.','How often does the speaker visit?','گوینده هر چند وقت به دیدن خواهرش می‌رود؟',['Jeden Tag','Alle zwei Wochen','Einmal im Monat'],1),
    item('listening','Leider ist die Heizung seit gestern kaputt. Könnten Sie heute jemanden vorbeischicken?','Why is the speaker calling?','گوینده چرا تماس گرفته است؟',['Ein Zimmer reservieren','Eine Rechnung bezahlen','Eine Reparatur organisieren'],2),
    item('listening','Ich wollte mit dem Bus fahren, aber wegen des Streiks habe ich das Fahrrad genommen.','How did the speaker travel?','گوینده با چه وسیله‌ای رفت؟',['Mit dem Fahrrad','Mit dem Bus','Mit dem Zug'],0),
    item('reading','Bitte geben Sie die Schlüssel spätestens am Freitag an der Rezeption ab.','By when must the keys be returned?','کلیدها حداکثر تا چه روزی باید تحویل داده شوند؟',['Montag','Freitag','Sonntag'],1),
    item('reading','Zu vermieten: ruhige Wohnung, zwei Zimmer, keine Haustiere erlaubt.','Who would this flat suit?','این خانه برای کدام شخص مناسب است؟',['Eine Person ohne Haustiere','Eine Familie mit einem Hund','Eine Person mit zwei Katzen'],0),
    item('reading','Wegen Bauarbeiten hält der Bus diese Woche nicht am Rathaus. Benutzen Sie die Haltestelle am Markt.','Where should passengers catch the bus?','مسافران از کدام ایستگاه باید سوار شوند؟',['Am Rathaus','Am Bahnhof','Am Markt'],2),
    item('reading','Liebe Frau Weber, ich kann am Dienstag nicht kommen. Wäre ein Termin am Mittwochvormittag möglich?','What does the writer request?','نویسنده چه درخواستی دارد؟',['Einen Termin am Dienstag','Einen Termin am Mittwochvormittag','Einen Termin am Mittwochabend'],1),
    item('reading','Wenn Sie die Ware innerhalb von vierzehn Tagen zurückschicken, erhalten Sie den Kaufpreis zurück. Die Versandkosten tragen Sie selbst.','Which cost will the customer pay?','مشتری کدام هزینه را پرداخت می‌کند؟',['Die Versandkosten','Den Kaufpreis','Keine Kosten'],0),
    item('reading','Obwohl die Stelle weiter entfernt war, nahm Lina sie an, weil sie dort ihre Arbeitszeiten selbst wählen konnte.','Why did Lina accept the job?','لینا چرا این شغل را پذیرفت؟',['Wegen des kurzen Weges','Wegen des höheren Gehalts','Wegen der flexiblen Arbeitszeiten'],2)
  ],
  b: [
    item('listening','Der Bus zum Flughafen fährt heute von Haltestelle sieben ab.','Which stop does the bus leave from?','اتوبوس از کدام ایستگاه حرکت می‌کند؟',['7','3','5'],0),
    item('listening','Ich nehme eine Suppe, aber bitte ohne Brot.','What does the customer want?','مشتری چه می‌خواهد؟',['Suppe mit Brot','Salat ohne Brot','Suppe ohne Brot'],2),
    item('listening','Unsere Bibliothek öffnet am Dienstag erst um elf Uhr.','When does the library open on Tuesday?','کتابخانه روز سه‌شنبه چه ساعتی باز می‌شود؟',['09:00','11:00','13:00'],1),
    item('listening','Mein Bruder wohnt in Mainz. Wir treffen uns an jedem zweiten Sonntag.','How often do they meet?','آنها هر چند وقت یکدیگر را می‌بینند؟',['Einmal im Jahr','Jede Woche','Alle zwei Wochen'],2),
    item('listening','Das Wasser in der Küche läuft seit heute Morgen nicht. Könnten Sie einen Handwerker schicken?','Why is the speaker calling?','گوینده چرا تماس گرفته است؟',['Eine Reparatur organisieren','Ein Essen bestellen','Eine Wohnung kaufen'],0),
    item('listening','Ich wollte mit dem Zug fahren, aber weil er ausfiel, bin ich mit dem Auto gefahren.','How did the speaker travel?','گوینده با چه وسیله‌ای رفت؟',['Mit dem Zug','Mit dem Auto','Mit dem Fahrrad'],1),
    item('reading','Bitte bringen Sie die Unterlagen spätestens am Donnerstag ins Büro.','By when must the documents arrive?','مدارک حداکثر تا چه روزی باید تحویل داده شوند؟',['Samstag','Dienstag','Donnerstag'],2),
    item('reading','Zimmer frei: Nichtraucher gesucht. Die Küche wird gemeinsam benutzt.','Who would this room suit?','این اتاق برای کدام شخص مناسب است؟',['Eine Person, die raucht','Eine Person, die nicht raucht','Eine Person, die eine eigene Küche braucht'],1),
    item('reading','Wegen einer Veranstaltung bleibt der Haupteingang heute geschlossen. Bitte benutzen Sie den Eingang im Hof.','Where should visitors enter?','مراجعان از کدام ورودی باید وارد شوند؟',['Durch den Eingang im Hof','Durch den Haupteingang','Durch die Garage'],0),
    item('reading','Lieber Herr Braun, am Freitag bin ich unterwegs. Können wir unser Gespräch auf Montag nach dem Mittagessen verschieben?','What does the writer request?','نویسنده چه درخواستی دارد؟',['Ein Gespräch am Freitag','Ein Gespräch am Montagmorgen','Ein Gespräch am Montagnachmittag'],2),
    item('reading','Bei einer Absage bis sieben Tage vor Kursbeginn erstatten wir die Kursgebühr. Die Anmeldegebühr wird nicht zurückgezahlt.','Which fee will not be refunded?','کدام هزینه پس داده نمی‌شود؟',['Die Kursgebühr','Die Anmeldegebühr','Beide Gebühren'],1),
    item('reading','Obwohl die Wohnung kleiner war, entschied sich Amir dafür, weil er von dort zu Fuß zur Arbeit gehen konnte.','Why did Amir choose the flat?','امیر چرا این خانه را انتخاب کرد؟',['Wegen des kurzen Arbeitswegs','Wegen der großen Zimmer','Wegen der niedrigen Miete'],0)
  ]
};
export function publicItems(form: 'a' | 'b') {
  return CHECK_FORMS[form].map(({ answer: _answer, text, ...item }) => ({ ...item,
    text: item.skill === 'reading' ? text : null,
    audio: item.skill === 'listening' ? `/proxy/tts?q=${encodeURIComponent(text)}&tl=de&voice=b&rate=0.9` : null
  }));
}
export function gradeCheck(form: 'a' | 'b', answers: unknown) {
  if (!Array.isArray(answers) || answers.length !== 12 || answers.some(a => a !== null && (!Number.isInteger(a) || a < 0 || a > 2))) return null;
  const items = CHECK_FORMS[form];
  return { listening_correct: items.slice(0,6).filter((q,i) => answers[i] === q.answer).length,
    reading_correct: items.slice(6).filter((q,i) => answers[i+6] === q.answer).length,
    skipped: answers.filter(a => a === null).length };
}
