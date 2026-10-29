import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import { FoundDialog } from '../../src/components/FoundDialog';

test('saves a trimmed comment and starts empty next time', async () => {
  const user = userEvent.setup();
  const onSave = jest.fn();
  const { rerender } = await render(<FoundDialog visible updating={false} onSave={onSave} onCancel={jest.fn()} />);
  await user.type(screen.getByPlaceholderText('Comment (optional)'), '  dry  ');
  await user.press(screen.getByRole('button', { name: 'Save find' }));
  expect(onSave).toHaveBeenCalledWith('dry');
  await rerender(<FoundDialog visible updating onSave={onSave} onCancel={jest.fn()} />);
  expect(screen.getByText('Update find')).toBeOnTheScreen();
  expect(screen.getByPlaceholderText('Comment (optional)')).toHaveDisplayValue('');
});

test('the Android back button cancels', async () => {
  const onCancel = jest.fn();
  const onSave = jest.fn();
  await render(<FoundDialog visible updating={false} onSave={onSave} onCancel={onCancel} />);
  await fireEvent(screen.getByTestId('found-dialog'), 'requestClose');
  expect(onCancel).toHaveBeenCalled();
  expect(onSave).not.toHaveBeenCalled();
});
