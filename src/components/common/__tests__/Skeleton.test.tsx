import React from 'react';
import { render } from '@testing-library/react-native';
import { Skeleton } from '../../common/Skeleton';
import { AccessibilityInfo } from 'react-native';

describe('Skeleton Component', () => {
  beforeEach(() => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders correctly with default props', async () => {
    const { getByTestId } = await render(
      <Skeleton testID="skeleton" />
    );
    const skeleton = getByTestId('skeleton');
    expect(skeleton).toBeTruthy();
  });

  it('applies width and height props correctly', async () => {
    const { getByTestId } = await render(
      <Skeleton testID="skeleton" width={100} height={50} borderRadius={8} />
    );
    const skeleton = getByTestId('skeleton');
    
    expect(skeleton.props.style).toMatchObject({
      width: 100,
      height: 50,
      borderRadius: 8,
    });
  });
});
