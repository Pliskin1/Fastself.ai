import { t } from '@/copy/sr';
import { ScreenScroll } from './ScreenScroll';
import { Display } from './Text';

type Props = { testID: string; titleKey: string; bottomInset?: number };

/** Placeholder for a route that a later task fills in. Replace the whole file body, keep the testID. */
export function StubScreen({ testID, titleKey, bottomInset }: Props) {
  return (
    <ScreenScroll testID={testID} bottomInset={bottomInset}>
      <Display>{t(titleKey)}</Display>
    </ScreenScroll>
  );
}
