import { render } from '@testing-library/react-native';

import { KeepAwake } from '../../src/components/KeepAwake';
import { activeKeepAwakeTags } from '../helpers/keepAwakeMock';

test('keeps the screen awake while mounted', async () => {
  const { unmount } = await render(<KeepAwake tag="compass" />);
  expect(activeKeepAwakeTags()).toEqual(['compass']);
  await unmount();
  expect(activeKeepAwakeTags()).toEqual([]);
});
