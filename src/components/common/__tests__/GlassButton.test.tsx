import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { GlassButton } from '../../common/GlassButton';

describe('GlassButton Component', () => {
  it('renders correctly with title', async () => {
    const { getByText } = await render(
      <GlassButton title="Submit" onPress={() => {}} />
    );
    expect(getByText('Submit')).toBeTruthy();
  });

  it('triggers onPress handler when tapped', async () => {
    const onPressMock = jest.fn();
    const { getByText } = await render(
      <GlassButton title="Click Me" onPress={onPressMock} />
    );
    
    fireEvent.press(getByText('Click Me'));
    expect(onPressMock).toHaveBeenCalledTimes(1);
  });

  it('renders activity indicator and disables press when loading', async () => {
    const onPressMock = jest.fn();
    const { queryByText } = await render(
      <GlassButton title="Loading Button" onPress={onPressMock} loading={true} />
    );

    // Should not render title text when loading
    expect(queryByText('Loading Button')).toBeNull();
  });

  it('prevents interactions when disabled', async () => {
    const onPressMock = jest.fn();
    const { getByText } = await render(
      <GlassButton title="Disabled" onPress={onPressMock} disabled={true} />
    );

    fireEvent.press(getByText('Disabled'));
    expect(onPressMock).not.toHaveBeenCalled();
  });

  it('passes accessibility props correctly', async () => {
    const { getByRole } = await render(
      <GlassButton
        title="Access"
        onPress={() => {}}
        accessibilityLabel="Access Label"
        accessibilityHint="Access Hint"
      />
    );

    const button = getByRole('button');
    expect(button.props.accessibilityLabel).toBe('Access Label');
    expect(button.props.accessibilityHint).toBe('Access Hint');
  });
});
