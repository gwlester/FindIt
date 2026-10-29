import { GUIDE_INTRO, HELP_TOPICS, helpTopic } from '../../src/help/content';

const ROUTES = ['index', 'place', 'compass/[id]', 'map', 'offline-maps', 'share', 'share-history', 'files', 'settings'];

test('every screen has a help topic with a title and text', () => {
  for (const route of ROUTES) {
    const topic = HELP_TOPICS.find((t) => t.route === route);
    expect(topic).toBeDefined();
    expect(topic!.title).toBeTruthy();
    expect(topic!.paragraphs.length).toBeGreaterThan(0);
  }
  expect(new Set(HELP_TOPICS.map((t) => t.id)).size).toBe(HELP_TOPICS.length);
});

test('the guide starts with getting started', () => {
  expect(GUIDE_INTRO.length).toBeGreaterThan(1);
});

test('looks topics up by id', () => {
  expect(helpTopic('compass')?.route).toBe('compass/[id]');
  expect(helpTopic('nope')).toBeUndefined();
  expect(helpTopic(undefined)).toBeUndefined();
});
