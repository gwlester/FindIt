import { render, screen } from '@testing-library/react-native';

import { QrCode } from '../../src/components/QrCode';

test('draws the code with a spoken description', async () => {
  await render(<QrCode value="https://example.com" size={200} label="QR code for example.com" />);
  expect(screen.getByLabelText('QR code for example.com')).toBeOnTheScreen();
  expect(screen.getByRole('image', { name: 'QR code for example.com' })).toBeOnTheScreen();
});
