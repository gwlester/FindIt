// In-app help: one topic per screen (shown by that screen's Help button) and the full
// "How to use FindIt" guide (the intro followed by every topic).

export type HelpTopic = {
  id: string;
  /** Expo Router route name of the screen this topic describes. */
  route: string;
  title: string;
  paragraphs: string[];
};

export const GUIDE_INTRO: string[] = [
  'FindIt keeps a list of named places and guides you back to them with a compass, the distance and an uncertainty radius, like geocaching. Everything is stored on your phone.',
  'Getting started: tap Add place, stand where you are, and tap Use current (or type coordinates). Later, tap the place in the list and follow the arrow. When you are close, the compass turns into a map of the search area.',
  'For the best position, stand still with a clear view of the sky and use Average my position for a minute or two. Turn on High-accuracy GPS in Settings to track every satellite.',
  'You can swap places with FindIt users nearby over Bluetooth, import and export GPX or GeoJSON files, and view places on a map, including maps saved for use without a connection.',
];

export const HELP_TOPICS: HelpTopic[] = [
  {
    id: 'places',
    route: 'index',
    title: 'Places',
    paragraphs: [
      'Your places, by name, with the distance from where you are now. Tap a place to open its compass. Long-press it to edit it, show it on the map, or delete it.',
      'A ✓ line shows when a place was found and by whom. Hide found places hides the ones you have found (Settings → Found places can turn finds off).',
      'Add place saves a new place; Share nearby swaps places over Bluetooth. Map, Files and Settings are at the top.',
    ],
  },
  {
    id: 'place',
    route: 'place',
    title: 'Add or edit a place',
    paragraphs: [
      'Give the place a name, then set its position: Use current takes one GPS fix, Average position combines many fixes while you stand still (better), or type the latitude and longitude.',
      'The accuracy (±) is saved with the place and widens the search area on the compass. Notes are for hints and anything else worth remembering.',
    ],
  },
  {
    id: 'compass',
    route: 'compass/[id]',
    title: 'Compass',
    paragraphs: [
      'The outer ring turns so N, E, S and W always point the real way; the arrow points at the place. Hold the phone flat. If it asks for calibration, move it in a figure-8.',
      'Below the compass: the distance, and the uncertainty radius, which combines your GPS accuracy and the place’s. The satellite line shows how many satellites are used.',
      'Close to the place (Settings → Search area), the middle becomes a map: you at the centre, the shaded search circle where the place most likely is, and scale rings. It can show a street map or satellite imagery behind it (Settings → Behind the search area).',
      'Average my position steadies the distance while you stand still; it stops by itself if you walk away. Mark found records a find, with an optional comment.',
    ],
  },
  {
    id: 'map',
    route: 'map',
    title: 'Map',
    paragraphs: [
      'All your places on a map; the blue dot is you. Tap a place for its distance and Find it, which opens the compass. Switch between Map (OpenStreetMap) and Satellite (USGS imagery, United States only).',
      'Download saves the area on screen, for the layer showing, so it works with no connection. Zoom in first if the area is too large. Offline maps lists what you have saved.',
    ],
  },
  {
    id: 'offline-maps',
    route: 'offline-maps',
    title: 'Offline maps',
    paragraphs: [
      'Map areas saved on the phone. They work in airplane mode and wherever there is no signal, on the map screen and behind the compass.',
      'To add one, open the map, show the area and tap Download; download once for Map and once for Satellite if you want both. Delete removes an area you no longer need.',
    ],
  },
  {
    id: 'share',
    route: 'share',
    title: 'Share nearby',
    paragraphs: [
      'Swap places with other FindIt users close by over Bluetooth. Both phones need Bluetooth on and this screen open.',
      'To give: tick the places and tap Share N places. To receive: tap Look for nearby FindIt users, tap a name, then choose which places to import. Places you already have are skipped.',
      'If you have found some of the places, you are asked whether to include that. Sharing history lists who has downloaded your places.',
    ],
  },
  {
    id: 'share-history',
    route: 'share-history',
    title: 'Sharing history',
    paragraphs: [
      'Who downloaded your shared places, when, and how many. Older FindIt versions do not send a name and appear as “FindIt user”.',
      'Entries are kept for the time set in Settings → Sharing history (or forever). Clear history removes them all.',
    ],
  },
  {
    id: 'files',
    route: 'files',
    title: 'Import / Export',
    paragraphs: [
      'Import reads GPX files (geocaching.com, GPS units, other apps) or GeoJSON; the format is detected from the file. You choose which places to import.',
      'Export writes the ticked places as GPX or GeoJSON and opens the share sheet, so you can save the file or send it. If you have found some of them, you are asked whether to include that.',
    ],
  },
  {
    id: 'settings',
    route: 'settings',
    title: 'Settings',
    paragraphs: [
      'Your name for sharing is what nearby FindIt users see. Units switch between metres and feet.',
      'High-accuracy GPS tracks every satellite on the compass (Android 12 and later; uses more battery). Search area sets how close you need to be before the compass shows the search-area map, and what is drawn behind it.',
      'Found places: off, once per place, or a log of every find. Sharing history: how long to remember who downloaded your places.',
    ],
  },
];

export function helpTopic(id: string | undefined): HelpTopic | undefined {
  return HELP_TOPICS.find((t) => t.id === id);
}
