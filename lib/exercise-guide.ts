/**
 * Erklärungen zu den Übungen aus dem Katalog (lib/exercises.ts).
 * Schlüssel = Übungsname wie im Katalog. Inhalte bewusst kurz: was, wie, worauf achten.
 * Ersetzt keine persönliche Einweisung – Trainer ergänzen ihren Hinweis je Übung im Plan.
 * Nur serverseitig: Kunden bekommen über GET /exercises/guides nur die Anleitungen ihrer Pläne.
 */

import "server-only";

export type ExerciseLevel = "Einsteiger" | "Fortgeschritten";

export interface ExerciseGuide {
  /** Ein Satz: worum geht es / wofür ist die Übung gut. */
  summary: string;
  /** Hauptsächlich beanspruchte Muskeln (zuerst die wichtigsten). */
  muscles: string[];
  equipment: string;
  level: ExerciseLevel;
  /** Ausführung Schritt für Schritt. */
  steps: string[];
  /** Typische Fehler und Tipps. */
  tips: string[];
}

export const EXERCISE_GUIDES: Record<string, ExerciseGuide> = {
  /* ── Ausdauer – Geräte ─────────────────────────────────────────────── */
  Laufband: {
    summary: "Gelenkschonendes Lauf- oder Geh-Training mit genau steuerbarem Tempo und Steigung.",
    muscles: ["Herz-Kreislauf", "Beine", "Gesäß"],
    equipment: "Laufband",
    level: "Einsteiger",
    steps: [
      "Auf die seitlichen Trittflächen stellen, Sicherheitsclip an der Kleidung befestigen.",
      "Band mit langsamem Gehtempo starten und erst dann aufsteigen.",
      "Tempo und Steigung schrittweise erhöhen, aufrecht laufen, Blick nach vorn.",
      "Zum Schluss 3–5 Minuten locker auslaufen, Band stoppen, dann absteigen.",
    ],
    tips: [
      "Nicht an den Griffen festhalten – das verfälscht Haltung und Kalorienverbrauch.",
      "1–2 % Steigung entsprechen ungefähr dem Laufen im Freien.",
      "Kurze, lockere Schritte unter dem Körper statt weit nach vorn zu greifen.",
    ],
  },
  Fahrradergometer: {
    summary: "Knieschonendes Ausdauertraining im Sitzen, ideal für Einsteiger und zum Aufwärmen.",
    muscles: ["Herz-Kreislauf", "Oberschenkel vorn", "Gesäß", "Waden"],
    equipment: "Fahrradergometer",
    level: "Einsteiger",
    steps: [
      "Sattelhöhe so einstellen, dass das Knie am tiefsten Punkt leicht gebeugt ist.",
      "Fußballen mittig auf die Pedale, Füße ggf. mit Schlaufen sichern.",
      "Mit niedrigem Widerstand einrollen, dann Widerstand bzw. Watt steigern.",
      "Gleichmäßig treten, Oberkörper ruhig, Schultern locker.",
    ],
    tips: [
      "Trittfrequenz von 70–90 Umdrehungen pro Minute ist für die meisten angenehm.",
      "Wippt die Hüfte im Sattel hin und her, ist der Sattel zu hoch.",
    ],
  },
  "Indoor Cycling": {
    summary: "Intensives Radtraining auf dem Spinning-Bike, oft mit Intervallen.",
    muscles: ["Herz-Kreislauf", "Oberschenkel", "Gesäß", "Waden"],
    equipment: "Indoor-Cycling-Bike",
    level: "Einsteiger",
    steps: [
      "Sattel auf Hüfthöhe einstellen, Lenker etwa auf Sattelhöhe.",
      "Mit leichtem Widerstand einrollen.",
      "Im Sitzen oder im Stehen fahren, Widerstand je nach Phase anpassen.",
      "Zum Bremsen den Widerstandsregler nach unten drücken.",
    ],
    tips: [
      "Nie ganz ohne Widerstand im Stehen fahren – das belastet die Knie.",
      "Rücken lang halten, nicht mit rundem Rücken über dem Lenker hängen.",
    ],
  },
  Crosstrainer: {
    summary: "Ganzkörper-Ausdauertraining mit fließender, gelenkschonender Bewegung.",
    muscles: ["Herz-Kreislauf", "Beine", "Gesäß", "Arme", "Rücken"],
    equipment: "Crosstrainer",
    level: "Einsteiger",
    steps: [
      "Mit ganzer Fußsohle auf die Pedale stellen, Griffe locker fassen.",
      "Bewegung langsam starten, Arme und Beine arbeiten gegengleich.",
      "Aufrecht bleiben, Becken stabil, Blick nach vorn.",
      "Stufe bzw. Widerstand nach dem Aufwärmen steigern.",
    ],
    tips: [
      "Fersen nicht abheben – sonst kribbeln schnell die Füße.",
      "Aktiv mit den Armen schieben und ziehen, nicht nur festhalten.",
    ],
  },
  Rudergerät: {
    summary: "Ganzkörper-Ausdauer mit hohem Anteil von Beinen und Rücken.",
    muscles: ["Herz-Kreislauf", "Beine", "Rücken", "Arme", "Rumpf"],
    equipment: "Rudergerät",
    level: "Einsteiger",
    steps: [
      "Füße festschnallen, Griff mit gestreckten Armen fassen, Schienbeine senkrecht.",
      "Zug startet mit den Beinen: kräftig abdrücken, Rücken bleibt gerade.",
      "Dann Oberkörper leicht nach hinten lehnen, zuletzt Griff zum unteren Brustbein ziehen.",
      "Zurück in umgekehrter Reihenfolge: Arme, Oberkörper, Beine.",
    ],
    tips: [
      "Faustregel: Beine 60 %, Rumpf 20 %, Arme 20 % der Kraft.",
      "Rückweg doppelt so lang wie der Zug – ruhig nach vorn rollen.",
      "Rücken nicht rund machen, vor allem nicht am Ende des Rückwegs.",
    ],
  },
  "Stepper / Treppensteiger": {
    summary: "Treppensteigen am Gerät – fordert Beine, Gesäß und Ausdauer.",
    muscles: ["Herz-Kreislauf", "Gesäß", "Oberschenkel", "Waden"],
    equipment: "Stepper oder Treppensteiger",
    level: "Einsteiger",
    steps: [
      "Aufrecht hinstellen, Griffe nur zur Balance leicht berühren.",
      "Mit langsamer Stufe beginnen, ganze Fußsohle aufsetzen.",
      "Gleichmäßiges Tempo finden, dann Stufe erhöhen.",
    ],
    tips: [
      "Nicht mit dem Oberkörper auf die Griffe stützen – das nimmt den Beinen die Arbeit ab.",
      "Kurze Pausen sind okay, lieber gleichmäßig als zu schnell.",
    ],
  },
  "Ski-Ergometer": {
    summary: "Ziehbewegung wie beim Skilanglauf – trainiert Oberkörper, Rumpf und Ausdauer.",
    muscles: ["Herz-Kreislauf", "Latissimus", "Trizeps", "Rumpf"],
    equipment: "Ski-Ergometer",
    level: "Fortgeschritten",
    steps: [
      "Hüftbreit vor das Gerät stellen, Griffe über Kopf fassen.",
      "Griffe kraftvoll nach unten ziehen, dabei in Hüfte und Knien leicht einknicken.",
      "Arme enden neben den Oberschenkeln.",
      "Kontrolliert aufrichten und Arme wieder nach oben führen.",
    ],
    tips: [
      "Die Kraft kommt aus Rumpf und Hüfte, nicht nur aus den Armen.",
      "Rücken neutral halten, nicht in eine tiefe Kniebeuge gehen.",
    ],
  },
  "Air Bike": {
    summary: "Fahrrad mit Armhebeln und Luftwiderstand – je schneller, desto schwerer. Ideal für Intervalle.",
    muscles: ["Herz-Kreislauf", "Beine", "Arme", "Schultern"],
    equipment: "Air Bike",
    level: "Fortgeschritten",
    steps: [
      "Sattel wie beim Ergometer einstellen, Griffe fassen.",
      "Gleichzeitig treten und mit den Armen schieben und ziehen.",
      "Für Intervalle: kurze, maximale Phasen im Wechsel mit lockerem Treten.",
    ],
    tips: [
      "Sehr intensiv – lieber kurze Intervalle (z. B. 20 s schnell, 40 s locker).",
      "Oberkörper ruhig halten, nicht hin und her schaukeln.",
    ],
  },

  /* ── Ausdauer – draußen & sonstiges ────────────────────────────────── */
  Laufen: {
    summary: "Klassisches Ausdauertraining – stärkt Herz-Kreislauf und Beine.",
    muscles: ["Herz-Kreislauf", "Beine", "Gesäß", "Rumpf"],
    equipment: "Laufschuhe",
    level: "Einsteiger",
    steps: [
      "5–10 Minuten zügig gehen oder locker einlaufen.",
      "Im Wohlfühltempo laufen – du solltest dich noch unterhalten können.",
      "Kurze Schritte, Füße landen etwa unter dem Körper.",
      "Zum Schluss auslaufen und locker dehnen.",
    ],
    tips: [
      "Einsteiger wechseln Laufen und Gehen ab (z. B. 2 min laufen, 1 min gehen).",
      "Wochenumfang um höchstens etwa 10 % steigern.",
    ],
  },
  Walking: {
    summary: "Zügiges Gehen – gelenkschonender Einstieg in das Ausdauertraining.",
    muscles: ["Herz-Kreislauf", "Beine", "Gesäß"],
    equipment: "Bequeme Schuhe",
    level: "Einsteiger",
    steps: [
      "Aufrecht gehen, Blick nach vorn, Schultern locker.",
      "Arme im Gegentakt zu den Beinen aktiv mitschwingen.",
      "Über die Ferse auf den Ballen abrollen.",
      "Tempo so wählen, dass du leicht außer Atem bist.",
    ],
    tips: ["Hügel oder leichte Steigungen erhöhen die Intensität ohne zu laufen."],
  },
  Radfahren: {
    summary: "Ausdauertraining draußen – schont die Gelenke und ist gut dosierbar.",
    muscles: ["Herz-Kreislauf", "Oberschenkel", "Gesäß", "Waden"],
    equipment: "Fahrrad, Helm",
    level: "Einsteiger",
    steps: [
      "Sattel so einstellen, dass das Knie unten fast gestreckt ist.",
      "Locker einrollen, dann in gleichmäßigem Tempo fahren.",
      "Lieber leichter Gang mit hoher Trittfrequenz als schwerer Gang.",
    ],
    tips: ["Helm tragen und genug trinken – bei langen Fahrten auch etwas essen."],
  },
  Schwimmen: {
    summary: "Ganzkörper-Ausdauer im Wasser – besonders gelenkschonend.",
    muscles: ["Herz-Kreislauf", "Rücken", "Schultern", "Beine", "Rumpf"],
    equipment: "Schwimmbad, ggf. Brille",
    level: "Einsteiger",
    steps: [
      "Ein paar lockere Bahnen zum Einschwimmen.",
      "Gleichmäßig atmen, beim Kraulen z. B. alle 3 Züge.",
      "Körper lang und flach im Wasser halten.",
      "Längere Strecken in Abschnitte mit kurzen Pausen teilen.",
    ],
    tips: ["Beim Brustschwimmen den Kopf nicht dauerhaft überstrecken – belastet den Nacken."],
  },
  Seilspringen: {
    summary: "Kurzes, intensives Cardio – schult Koordination und Sprungkraft.",
    muscles: ["Herz-Kreislauf", "Waden", "Schultern"],
    equipment: "Springseil",
    level: "Einsteiger",
    steps: [
      "Seillänge prüfen: auf die Mitte stellen, Griffe reichen bis unter die Achseln.",
      "Ellbogen nah am Körper, das Seil aus den Handgelenken drehen.",
      "Kleine, federnde Sprünge auf den Fußballen.",
    ],
    tips: [
      "Nur so hoch springen, dass das Seil gerade durchpasst.",
      "Weicher Untergrund schont Gelenke – kein Beton.",
    ],
  },

  /* ── Beine ─────────────────────────────────────────────────────────── */
  Kniebeuge: {
    summary: "Grundübung für Beine und Gesäß – mit Langhantel auf dem oberen Rücken.",
    muscles: ["Oberschenkel vorn", "Gesäß", "Oberschenkel hinten", "Rumpf"],
    equipment: "Langhantel, Rack",
    level: "Fortgeschritten",
    steps: [
      "Hantel auf den oberen Trapezmuskel legen, Füße etwa schulterbreit, Fußspitzen leicht nach außen.",
      "Rumpf anspannen, tief einatmen.",
      "Hüfte nach hinten und unten, Knie folgen den Fußspitzen.",
      "So tief gehen, wie der Rücken gerade bleibt – idealerweise Oberschenkel parallel zum Boden.",
      "Aus den Fersen kraftvoll hochdrücken, oben ausatmen.",
    ],
    tips: [
      "Knie nicht nach innen fallen lassen.",
      "Fersen bleiben am Boden.",
      "Blick leicht nach vorn unten, Kopf in Verlängerung der Wirbelsäule.",
    ],
  },
  Frontkniebeuge: {
    summary: "Kniebeuge mit der Hantel vorn auf den Schultern – aufrechter Oberkörper, mehr Fokus auf die Oberschenkel.",
    muscles: ["Oberschenkel vorn", "Gesäß", "Rumpf", "oberer Rücken"],
    equipment: "Langhantel, Rack",
    level: "Fortgeschritten",
    steps: [
      "Hantel vorn auf die Schultern legen, Ellbogen weit nach vorn oben.",
      "Füße schulterbreit, Rumpf fest anspannen.",
      "Gerade nach unten beugen, Oberkörper bleibt aufrecht.",
      "Kraftvoll hochdrücken, Ellbogen bleiben oben.",
    ],
    tips: ["Sinken die Ellbogen ab, rollt die Hantel nach vorn – Ellbogen aktiv hoch halten."],
  },
  Beinpresse: {
    summary: "Geführte Beinübung – gut, um Beinkraft ohne viel Technik aufzubauen.",
    muscles: ["Oberschenkel vorn", "Gesäß", "Oberschenkel hinten"],
    equipment: "Beinpresse",
    level: "Einsteiger",
    steps: [
      "Rücken und Gesäß fest an die Polster, Füße hüftbreit mittig auf die Platte.",
      "Sicherung lösen.",
      "Knie langsam beugen, bis etwa 90° erreicht sind.",
      "Über die ganze Fußsohle zurückdrücken, Knie oben nicht ganz durchstrecken.",
      "Nach dem letzten Satz Sicherung wieder einlegen.",
    ],
    tips: [
      "Gesäß darf unten nicht vom Polster abheben – sonst wird der untere Rücken rund.",
      "Füße höher auf der Platte = mehr Gesäß, tiefer = mehr Oberschenkel vorn.",
    ],
  },
  Ausfallschritte: {
    summary: "Einbeinige Übung für Beine und Gesäß – schult auch Gleichgewicht.",
    muscles: ["Oberschenkel vorn", "Gesäß", "Oberschenkel hinten"],
    equipment: "Eigengewicht oder Kurzhanteln",
    level: "Einsteiger",
    steps: [
      "Aufrecht stehen, ggf. Kurzhanteln seitlich halten.",
      "Großen Schritt nach vorn machen.",
      "Hinteres Knie Richtung Boden absenken, beide Knie etwa im 90°-Winkel.",
      "Über die vordere Ferse zurück in den Stand drücken, Seite wechseln.",
    ],
    tips: [
      "Vorderes Knie bleibt über dem Fuß und kippt nicht nach innen.",
      "Oberkörper aufrecht, Schritt lang genug wählen.",
    ],
  },
  "Bulgarian Split Squat": {
    summary: "Einbeinige Kniebeuge mit hinterem Fuß auf einer Bank – sehr effektiv für Beine und Gesäß.",
    muscles: ["Oberschenkel vorn", "Gesäß"],
    equipment: "Bank, optional Kurzhanteln",
    level: "Fortgeschritten",
    steps: [
      "Mit dem Rücken zur Bank stehen, Spann des hinteren Fußes auf die Bank legen.",
      "Vorderen Fuß so weit vorn platzieren, dass das Knie unten über dem Fuß ist.",
      "Gerade nach unten sinken, bis der vordere Oberschenkel etwa parallel ist.",
      "Über die vordere Ferse hochdrücken.",
    ],
    tips: [
      "Das vordere Bein macht die Arbeit, das hintere hält nur die Balance.",
      "Leicht nach vorn gelehnter Oberkörper betont das Gesäß.",
    ],
  },
  "Hip Thrust": {
    summary: "Hüftstrecken mit Schultern auf der Bank – eine der besten Übungen für das Gesäß.",
    muscles: ["Gesäß", "Oberschenkel hinten"],
    equipment: "Bank, Langhantel mit Polster",
    level: "Einsteiger",
    steps: [
      "Schulterblätter an die Bankkante, Hantel mit Polster in die Hüftbeuge.",
      "Füße hüftbreit aufstellen, Knie oben etwa im 90°-Winkel.",
      "Hüfte nach oben drücken, bis Oberkörper und Oberschenkel eine Linie bilden.",
      "Oben kurz das Gesäß anspannen, kontrolliert absenken.",
    ],
    tips: [
      "Kinn leicht zur Brust, nicht ins Hohlkreuz drücken.",
      "Druck über die Fersen, nicht über die Zehen.",
    ],
  },
  Beinstrecker: {
    summary: "Isolationsübung für die vordere Oberschenkelmuskulatur.",
    muscles: ["Oberschenkel vorn"],
    equipment: "Beinstrecker-Maschine",
    level: "Einsteiger",
    steps: [
      "Sitz so einstellen, dass das Kniegelenk auf Höhe der Drehachse liegt.",
      "Polster knapp oberhalb der Fußgelenke.",
      "Beine kontrolliert strecken, oben kurz halten.",
      "Langsam wieder absenken.",
    ],
    tips: ["Nicht mit Schwung arbeiten – das Gewicht nicht fallen lassen."],
  },
  Beinbeuger: {
    summary: "Isolationsübung für die hintere Oberschenkelmuskulatur.",
    muscles: ["Oberschenkel hinten", "Waden"],
    equipment: "Beinbeuger-Maschine (sitzend oder liegend)",
    level: "Einsteiger",
    steps: [
      "Maschine so einstellen, dass das Knie auf Höhe der Drehachse liegt.",
      "Polster oberhalb der Fersen.",
      "Beine kontrolliert beugen, kurz halten.",
      "Langsam zurück in die Streckung.",
    ],
    tips: ["Becken bleibt auf dem Polster – nicht mit der Hüfte nachhelfen."],
  },
  Wadenheben: {
    summary: "Kräftigt die Waden – stehend an der Maschine, an einer Stufe oder mit Hanteln.",
    muscles: ["Waden"],
    equipment: "Wadenmaschine, Stufe oder Kurzhanteln",
    level: "Einsteiger",
    steps: [
      "Fußballen auf eine Stufe oder Plattform, Fersen frei.",
      "Fersen langsam absenken, bis die Wade gedehnt ist.",
      "So hoch wie möglich auf die Zehenspitzen drücken, kurz halten.",
    ],
    tips: ["Volle Bewegung und langsames Tempo bringen mehr als viel Gewicht."],
  },

  /* ── Rücken ────────────────────────────────────────────────────────── */
  Kreuzheben: {
    summary: "Grundübung, bei der die Hantel vom Boden gehoben wird – kräftigt die gesamte Körperrückseite.",
    muscles: ["unterer Rücken", "Gesäß", "Oberschenkel hinten", "oberer Rücken", "Unterarme"],
    equipment: "Langhantel",
    level: "Fortgeschritten",
    steps: [
      "Hüftbreit stehen, Stange über der Fußmitte, nah am Schienbein.",
      "Stange schulterbreit greifen, Hüfte nach hinten, Rücken gerade, Brust raus.",
      "Rumpf anspannen, Spannung aufbauen („Stange vom Boden lösen“).",
      "Mit den Beinen vom Boden drücken, Stange nah am Körper nach oben führen.",
      "Oben aufrecht stehen, Gesäß fest – dann kontrolliert auf dem gleichen Weg ablegen.",
    ],
    tips: [
      "Rücken nie rund werden lassen – lieber weniger Gewicht.",
      "Oben nicht nach hinten ins Hohlkreuz lehnen.",
      "Stange schleift fast an den Beinen entlang.",
    ],
  },
  "Rumänisches Kreuzheben": {
    summary: "Kreuzheben mit fast gestreckten Beinen – Fokus auf hintere Oberschenkel und Gesäß.",
    muscles: ["Oberschenkel hinten", "Gesäß", "unterer Rücken"],
    equipment: "Langhantel oder Kurzhanteln",
    level: "Fortgeschritten",
    steps: [
      "Aufrecht mit Hantel stehen, Knie leicht gebeugt.",
      "Hüfte weit nach hinten schieben, Hantel gleitet an den Oberschenkeln nach unten.",
      "Bis zur deutlichen Dehnung hinten in den Beinen gehen – meist knapp unter dem Knie.",
      "Hüfte nach vorn schieben und aufrichten.",
    ],
    tips: [
      "Bewegung kommt aus der Hüfte, nicht aus dem Rücken.",
      "Kniewinkel bleibt während der ganzen Wiederholung gleich.",
    ],
  },
  Klimmzüge: {
    summary: "Ziehen des eigenen Körpergewichts an der Stange – Königsübung für den Rücken.",
    muscles: ["Latissimus", "Bizeps", "oberer Rücken", "Rumpf"],
    equipment: "Klimmzugstange, ggf. Band oder Maschine zur Unterstützung",
    level: "Fortgeschritten",
    steps: [
      "Stange etwas weiter als schulterbreit greifen, Handflächen nach vorn.",
      "Schultern aktiv nach unten ziehen, Körper anspannen.",
      "Hochziehen, bis das Kinn über der Stange ist.",
      "Kontrolliert ablassen bis fast gestreckte Arme.",
    ],
    tips: [
      "Nicht schwingen oder mit den Beinen kicken.",
      "Noch kein Klimmzug? Mit Gummiband, Maschine oder nur langsamem Ablassen (negativ) beginnen.",
    ],
  },
  Latzug: {
    summary: "Ziehen am Kabel von oben – baut Kraft für Klimmzüge auf und trainiert den breiten Rücken.",
    muscles: ["Latissimus", "Bizeps", "oberer Rücken"],
    equipment: "Latzug-Maschine",
    level: "Einsteiger",
    steps: [
      "Oberschenkel unter dem Polster fixieren, Stange etwas weiter als schulterbreit greifen.",
      "Oberkörper leicht nach hinten lehnen, Brust raus.",
      "Stange zur oberen Brust ziehen, Ellbogen Richtung Hüfte führen.",
      "Kontrolliert zurück nach oben, Arme fast gestreckt.",
    ],
    tips: [
      "Stange nicht hinter den Nacken ziehen.",
      "Nicht mit dem ganzen Oberkörper nach hinten reißen.",
    ],
  },
  Langhantelrudern: {
    summary: "Vorgebeugtes Rudern mit der Langhantel – für einen kräftigen oberen Rücken.",
    muscles: ["oberer Rücken", "Latissimus", "hintere Schulter", "Bizeps"],
    equipment: "Langhantel",
    level: "Fortgeschritten",
    steps: [
      "Hantel schulterbreit greifen, Knie leicht beugen, Oberkörper etwa 45° nach vorn neigen.",
      "Rücken gerade, Rumpf angespannt.",
      "Hantel zum Bauchnabel ziehen, Schulterblätter zusammen.",
      "Kontrolliert absenken.",
    ],
    tips: [
      "Oberkörper bleibt ruhig – kein Schwung aus der Hüfte.",
      "Rücken darf nicht rund werden.",
    ],
  },
  Kabelrudern: {
    summary: "Rudern am Kabelzug im Sitzen – gut zu dosieren und rückenfreundlich.",
    muscles: ["oberer Rücken", "Latissimus", "Bizeps"],
    equipment: "Kabelzug mit Rudergriff",
    level: "Einsteiger",
    steps: [
      "Aufrecht sitzen, Füße auf den Trittflächen, Knie leicht gebeugt.",
      "Griff mit gestreckten Armen halten, Schultern nach hinten unten.",
      "Griff zum Bauch ziehen, Schulterblätter zusammenführen.",
      "Langsam zurück, Arme strecken, Oberkörper bleibt aufrecht.",
    ],
    tips: ["Nicht mit dem Oberkörper vor und zurück schaukeln."],
  },
  "Face Pulls": {
    summary: "Ziehen am Seil Richtung Gesicht – stärkt hintere Schulter und Haltung.",
    muscles: ["hintere Schulter", "oberer Rücken", "Rotatorenmanschette"],
    equipment: "Kabelzug mit Seil",
    level: "Einsteiger",
    steps: [
      "Kabel auf Gesichtshöhe einstellen, Seil mit beiden Händen greifen.",
      "Einen Schritt zurück, Arme gestreckt.",
      "Seil Richtung Stirn ziehen, Hände auseinander, Ellbogen hoch.",
      "Kurz halten, langsam zurück.",
    ],
    tips: ["Leichtes Gewicht und saubere Bewegung – das ist eine Haltungsübung."],
  },

  /* ── Brust ─────────────────────────────────────────────────────────── */
  Bankdrücken: {
    summary: "Grundübung für Brust, Schultern und Trizeps mit der Langhantel auf der Flachbank.",
    muscles: ["Brust", "vordere Schulter", "Trizeps"],
    equipment: "Langhantel, Flachbank mit Ablage",
    level: "Fortgeschritten",
    steps: [
      "Auf die Bank legen, Augen unter der Stange, Füße fest am Boden.",
      "Stange etwas weiter als schulterbreit greifen, Schulterblätter zusammen und nach unten.",
      "Stange aus der Ablage heben und über der Brust stabilisieren.",
      "Kontrolliert zur unteren Brust absenken, Ellbogen etwa 45° vom Körper.",
      "Kraftvoll nach oben drücken.",
    ],
    tips: [
      "Bei schweren Sätzen immer mit Sicherungspartner oder Sicherheitsablage trainieren.",
      "Gesäß bleibt auf der Bank.",
      "Stange nicht auf der Brust abfedern lassen.",
    ],
  },
  Schrägbankdrücken: {
    summary: "Bankdrücken auf der Schrägbank – mehr Fokus auf die obere Brust.",
    muscles: ["obere Brust", "vordere Schulter", "Trizeps"],
    equipment: "Langhantel oder Kurzhanteln, Schrägbank (30–45°)",
    level: "Fortgeschritten",
    steps: [
      "Bank auf 30–45° stellen, Rücken fest an die Lehne.",
      "Schulterblätter zusammen und nach unten.",
      "Gewicht zur oberen Brust absenken.",
      "Nach oben drücken, ohne die Ellbogen ganz durchzustrecken.",
    ],
    tips: ["Zu steile Bank verlagert die Arbeit vor allem auf die Schultern."],
  },
  "Kurzhantel-Bankdrücken": {
    summary: "Bankdrücken mit zwei Kurzhanteln – größere Bewegung und jede Seite arbeitet für sich.",
    muscles: ["Brust", "vordere Schulter", "Trizeps"],
    equipment: "Kurzhanteln, Flachbank",
    level: "Einsteiger",
    steps: [
      "Mit den Hanteln auf den Oberschenkeln hinsetzen, beim Hinlegen mit nach oben nehmen.",
      "Hanteln über der Brust halten, Handflächen Richtung Füße.",
      "Seitlich der Brust absenken, bis eine leichte Dehnung spürbar ist.",
      "Nach oben drücken, Hanteln oben leicht zueinander führen.",
    ],
    tips: ["Hanteln nach dem Satz kontrolliert auf die Oberschenkel nehmen – nicht seitlich fallen lassen."],
  },
  Liegestütze: {
    summary: "Drückübung mit dem eigenen Körpergewicht – überall machbar.",
    muscles: ["Brust", "Trizeps", "vordere Schulter", "Rumpf"],
    equipment: "Keins",
    level: "Einsteiger",
    steps: [
      "Hände etwas weiter als schulterbreit, Körper von Kopf bis Fuß in einer Linie.",
      "Bauch und Gesäß anspannen.",
      "Brust kontrolliert Richtung Boden senken, Ellbogen etwa 45° vom Körper.",
      "Wieder hochdrücken, ohne dass die Hüfte durchhängt.",
    ],
    tips: [
      "Zu schwer? Hände erhöht auf eine Bank stellen oder auf den Knien üben.",
      "Kopf in Verlängerung der Wirbelsäule.",
    ],
  },
  Dips: {
    summary: "Stütz am Barren mit Beugen und Strecken der Arme – für Trizeps und untere Brust.",
    muscles: ["Trizeps", "untere Brust", "vordere Schulter"],
    equipment: "Dip-Barren, ggf. Unterstützungsmaschine",
    level: "Fortgeschritten",
    steps: [
      "In den Stütz gehen, Arme gestreckt, Schultern nach unten.",
      "Langsam absenken, bis die Oberarme etwa parallel zum Boden sind.",
      "Wieder hochdrücken.",
    ],
    tips: [
      "Nicht zu tief gehen, wenn die Schulter zwickt.",
      "Oberkörper leicht nach vorn = mehr Brust, aufrecht = mehr Trizeps.",
    ],
  },
  Butterfly: {
    summary: "Isolationsübung für die Brust an der Maschine oder am Kabel.",
    muscles: ["Brust", "vordere Schulter"],
    equipment: "Butterfly-Maschine oder Kabelzug",
    level: "Einsteiger",
    steps: [
      "Sitz so einstellen, dass die Griffe auf Brusthöhe sind.",
      "Arme leicht gebeugt, Rücken an der Lehne.",
      "Griffe in einem Bogen vor der Brust zusammenführen.",
      "Kontrolliert zurück, bis die Brust leicht gedehnt ist.",
    ],
    tips: ["Ellbogenwinkel bleibt gleich – es ist keine Drückbewegung."],
  },

  /* ── Schultern ─────────────────────────────────────────────────────── */
  Schulterdrücken: {
    summary: "Drücken über Kopf – Grundübung für kräftige Schultern.",
    muscles: ["vordere und seitliche Schulter", "Trizeps", "Rumpf"],
    equipment: "Kurzhanteln, Langhantel oder Maschine",
    level: "Einsteiger",
    steps: [
      "Sitzend oder stehend, Gewicht auf Schulterhöhe, Handflächen nach vorn.",
      "Rumpf anspannen.",
      "Gewicht senkrecht über den Kopf drücken.",
      "Kontrolliert zurück auf Schulterhöhe.",
    ],
    tips: ["Nicht ins Hohlkreuz ausweichen – lieber Gewicht reduzieren."],
  },
  Seitheben: {
    summary: "Seitliches Anheben der Arme – für breite, runde Schultern.",
    muscles: ["seitliche Schulter"],
    equipment: "Kurzhanteln oder Kabelzug",
    level: "Einsteiger",
    steps: [
      "Aufrecht stehen, Hanteln seitlich am Körper, Ellbogen leicht gebeugt.",
      "Arme seitlich bis auf Schulterhöhe anheben.",
      "Kurz halten, langsam absenken.",
    ],
    tips: [
      "Leichtes Gewicht wählen – Schwung nimmt der Schulter die Arbeit ab.",
      "Schultern nicht zu den Ohren hochziehen.",
    ],
  },
  "Reverse Flys": {
    summary: "Arme nach hinten öffnen – stärkt hintere Schulter und oberen Rücken.",
    muscles: ["hintere Schulter", "oberer Rücken"],
    equipment: "Kurzhanteln, Maschine oder Kabelzug",
    level: "Einsteiger",
    steps: [
      "Oberkörper nach vorn neigen oder an der Maschine sitzen, Arme leicht gebeugt.",
      "Arme seitlich nach hinten öffnen, Schulterblätter zusammen.",
      "Kurz halten, kontrolliert zurück.",
    ],
    tips: ["Bewegung aus der Schulter, nicht aus dem Rücken."],
  },

  /* ── Arme ──────────────────────────────────────────────────────────── */
  Bizepscurls: {
    summary: "Beugen der Arme mit Gewicht – Klassiker für den Bizeps.",
    muscles: ["Bizeps", "Unterarme"],
    equipment: "Kurzhanteln, Langhantel oder Kabel",
    level: "Einsteiger",
    steps: [
      "Aufrecht stehen, Gewicht mit gestreckten Armen, Handflächen nach vorn.",
      "Ellbogen bleiben seitlich am Körper.",
      "Gewicht zur Schulter beugen.",
      "Langsam absenken bis fast gestreckt.",
    ],
    tips: ["Nicht mit dem Oberkörper Schwung holen."],
  },
  Hammercurls: {
    summary: "Curls mit neutralem Griff – trainiert Bizeps und Unterarm.",
    muscles: ["Bizeps", "Oberarmmuskel", "Unterarme"],
    equipment: "Kurzhanteln",
    level: "Einsteiger",
    steps: [
      "Hanteln seitlich halten, Handflächen zeigen zueinander.",
      "Ellbogen am Körper, Gewicht nach oben beugen.",
      "Langsam absenken.",
    ],
    tips: ["Handgelenk bleibt gerade."],
  },
  "Trizepsdrücken am Kabel": {
    summary: "Strecken der Arme am Kabelzug – isoliert den Trizeps.",
    muscles: ["Trizeps"],
    equipment: "Kabelzug mit Seil oder Stange",
    level: "Einsteiger",
    steps: [
      "Vor den Kabelzug stellen, Griff auf Brusthöhe, Ellbogen am Körper.",
      "Arme nach unten strecken, bis sie gerade sind.",
      "Kurz halten, kontrolliert zurück bis etwa 90°.",
    ],
    tips: ["Ellbogen bewegen sich nicht – nur der Unterarm arbeitet."],
  },
  "French Press": {
    summary: "Trizepsübung im Liegen – Gewicht hinter den Kopf senken und strecken.",
    muscles: ["Trizeps"],
    equipment: "SZ-Stange oder Kurzhanteln, Flachbank",
    level: "Fortgeschritten",
    steps: [
      "Auf der Bank liegen, Gewicht mit gestreckten Armen über der Brust.",
      "Nur die Ellbogen beugen und das Gewicht Richtung Stirn bzw. hinter den Kopf senken.",
      "Zurück in die Streckung drücken.",
    ],
    tips: ["Ellbogen zeigen zur Decke und gehen nicht weit auseinander.", "Moderates Gewicht – die Ellbogen danken es."],
  },

  /* ── Rumpf ─────────────────────────────────────────────────────────── */
  Plank: {
    summary: "Halteübung im Unterarmstütz – stabilisiert den gesamten Rumpf.",
    muscles: ["gerade Bauchmuskeln", "tiefe Bauchmuskeln", "Schultern", "Gesäß"],
    equipment: "Matte",
    level: "Einsteiger",
    steps: [
      "Unterarme unter den Schultern auf den Boden, Beine gestreckt.",
      "Körper von Kopf bis Fersen in einer Linie.",
      "Bauch und Gesäß anspannen, ruhig weiteratmen.",
      "Position für die vorgegebene Zeit halten.",
    ],
    tips: [
      "Hüfte weder durchhängen lassen noch nach oben schieben.",
      "Zu schwer? Auf den Knien beginnen.",
    ],
  },
  Crunches: {
    summary: "Aufrollen des Oberkörpers – für die geraden Bauchmuskeln.",
    muscles: ["gerade Bauchmuskeln"],
    equipment: "Matte",
    level: "Einsteiger",
    steps: [
      "Rückenlage, Beine angewinkelt, Füße am Boden.",
      "Hände locker an die Schläfen oder vor der Brust kreuzen.",
      "Oberkörper einrollen, bis die Schulterblätter vom Boden abheben.",
      "Langsam zurückrollen.",
    ],
    tips: ["Nicht am Kopf ziehen – zwischen Kinn und Brust passt eine Faust."],
  },
  "Hanging Leg Raises": {
    summary: "Beine im Hang an der Stange anheben – anspruchsvolle Bauchübung.",
    muscles: ["untere Bauchmuskeln", "Hüftbeuger", "Unterarme"],
    equipment: "Klimmzugstange",
    level: "Fortgeschritten",
    steps: [
      "An die Stange hängen, Schultern aktiv nach unten.",
      "Beine gestreckt oder angewinkelt nach oben heben, Becken dabei einrollen.",
      "Langsam absenken, ohne zu schwingen.",
    ],
    tips: ["Zu schwer? Mit angewinkelten Knien beginnen."],
  },
  "Russian Twists": {
    summary: "Oberkörper im Sitzen von Seite zu Seite drehen – für die seitlichen Bauchmuskeln.",
    muscles: ["schräge Bauchmuskeln", "gerade Bauchmuskeln"],
    equipment: "Matte, optional Gewicht",
    level: "Einsteiger",
    steps: [
      "Sitzen, Knie gebeugt, Oberkörper leicht nach hinten lehnen.",
      "Rücken gerade, Hände vor der Brust oder ein Gewicht halten.",
      "Oberkörper abwechselnd nach links und rechts drehen.",
    ],
    tips: ["Die Drehung kommt aus dem Oberkörper, nicht nur aus den Armen.", "Für mehr Schwierigkeit die Füße anheben."],
  },
};

const guideByName = new Map(Object.entries(EXERCISE_GUIDES).map(([name, g]) => [name.toLowerCase(), g]));

/** Erklärung zu einer Übung (Groß-/Kleinschreibung egal), sonst `undefined`. */
export const findGuide = (name: string) => guideByName.get(name.trim().toLowerCase());
