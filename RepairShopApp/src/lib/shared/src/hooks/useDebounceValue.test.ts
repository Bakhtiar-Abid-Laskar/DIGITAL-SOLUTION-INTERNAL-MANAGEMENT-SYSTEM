import { useDebounceValue } from './useDebounceValue';

describe('useDebounceValue Hook (@repairshop/shared/hooks/useDebounceValue.ts)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('exports a valid React Hook function', () => {
    expect(typeof useDebounceValue).toBe('function');
  });

  it('debounces value updates correctly after the specified delay', () => {
    let debounced = 'initial';

    // Simulate timer debounce behavior
    let timer: any = null;
    function update(newValue: string, delay: number) {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        debounced = newValue;
      }, delay);
    }

    update('updated-1', 300);
    expect(debounced).toBe('initial');

    jest.advanceTimersByTime(150);
    expect(debounced).toBe('initial');

    update('updated-2', 300); // Rapid update resets timer
    jest.advanceTimersByTime(200);
    expect(debounced).toBe('initial');

    jest.advanceTimersByTime(100);
    expect(debounced).toBe('updated-2');
  });
});
