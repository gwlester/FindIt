import { render, screen, userEvent } from '@testing-library/react-native';
import { Text } from 'react-native';

import { Button, Checkbox, Field, Section } from '../../src/components/ui';

test('Button variants press and disable', async () => {
  const user = userEvent.setup();
  const onPress = jest.fn();
  await render(
    <>
      <Button title="Go" onPress={onPress} />
      <Button title="Back" variant="secondary" onPress={onPress} />
      <Button title="Delete" variant="danger" onPress={onPress} disabled />
    </>,
  );
  await user.press(screen.getByRole('button', { name: 'Go' }));
  await user.press(screen.getByRole('button', { name: 'Back' }));
  expect(onPress).toHaveBeenCalledTimes(2);
  expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled();
});

test('Field shows label, hint and value', async () => {
  const user = userEvent.setup();
  const onChangeText = jest.fn();
  await render(
    <>
      <Field label="Name" hint="Be nice" value="" onChangeText={onChangeText} placeholder="type" />
      <Field label="Plain" value="x" />
    </>,
  );
  expect(screen.getByText('Be nice')).toBeOnTheScreen();
  await user.type(screen.getByPlaceholderText('type'), 'ab');
  expect(onChangeText).toHaveBeenLastCalledWith('b');
  expect(screen.getByDisplayValue('x')).toBeOnTheScreen();
});

test('Section and Checkbox', async () => {
  const user = userEvent.setup();
  const onToggle = jest.fn();
  await render(
    <Section title="Things">
      <Text>child</Text>
      <Checkbox checked label="One" sublabel="first" onToggle={onToggle} />
      <Checkbox checked={false} label="Two" onToggle={onToggle} />
    </Section>,
  );
  expect(screen.getByText('Things')).toBeOnTheScreen();
  expect(screen.getByRole('checkbox', { name: /One/ })).toBeChecked();
  expect(screen.getByRole('checkbox', { name: 'Two' })).not.toBeChecked();
  await user.press(screen.getByRole('checkbox', { name: 'Two' }));
  expect(onToggle).toHaveBeenCalled();
});
