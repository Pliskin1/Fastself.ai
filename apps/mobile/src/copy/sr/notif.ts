export default {
  // Name of the Android notification channel, shown in the phone's notification settings.
  'notif.channel': 'Podsjetnici',

  // Local notifications (docs/COPY.md §9). Each one has a title and a body.
  'notif.eve.title': 'Sutra je {title}',
  'notif.eve.body': 'Na tanjiru: {allowed}. Ne može: {forbidden}.',
  'notif.window.open.title': 'Prozor za jelo je otvoren',
  'notif.window.open.body': 'Do {to}.',
  'notif.window.close.title': 'Prozor za jelo se zatvara za 30 minuta',
  'notif.window.close.body': 'Post počinje u {to}.',
  'notif.if.end.title': 'Post je završen',
  'notif.if.end.body': '{h} h. Prozor za jelo je otvoren do {to}.',
  'notif.sehur.title': 'Sehur do {fajr}',
  'notif.sehur.body': 'Zora je za 30 minuta.',
  'notif.iftar.title': 'Akšam je, {time}',
  'notif.iftar.body': 'Iftar. Post prekini sa nekoliko urmi i čašom vode.',
  'notif.nafila.title': 'Sutra je dan za dobrovoljni post',
  'notif.nafila.body': '{reason}. Uključi ga u aplikaciji ako postiš.',

  // The dev screen only (__DEV__): the test notification and the labels of its section.
  'notif.test.title': 'Probno obavještenje',
  'notif.test.body': 'Podsjetnici rade na ovom telefonu.',
  'notif.dev.title': 'Zakazani podsjetnici',
  'notif.dev.count': 'Zakazano: {n}',
  'notif.dev.empty': 'Nema zakazanih podsjetnika.',
  'notif.dev.test': 'Pošalji probno obavještenje za 5 sekundi',
  'notif.dev.sent': 'Probno obavještenje stiže za 5 sekundi.',
  'notif.dev.denied': 'Obavještenja nisu dozvoljena na ovom telefonu.',
  'notif.dev.reschedule': 'Zakaži ponovo',
} as Record<string, string>;
