import { screen } from '@testing-library/react-native';
import type { ComponentType } from 'react';
import { renderUI } from '@/components/test-utils';
import R0 from '@/app/(onboarding)/welcome';
import R1 from '@/app/(onboarding)/prakse';
import R2 from '@/app/(onboarding)/alergije';
import R3 from '@/app/(onboarding)/sigurnost';
import R4 from '@/app/(onboarding)/dozvole';
import R5 from '@/app/(onboarding)/nalog';
import R6 from '@/app/(tabs)/danas';
import R7 from '@/app/(tabs)/kalendar';
import R8 from '@/app/(tabs)/plan';
import R9 from '@/app/(tabs)/tajmer';
import R10 from '@/app/(tabs)/profil';
import R11 from '@/app/prakse';
import R12 from '@/app/alergije';
import R13 from '@/app/vaktija';
import R14 from '@/app/privatnost';
import R15 from '@/app/asistent';
import R16 from '@/app/nalog';
import R17 from '@/app/(sheets)/prijava-greske';
import R18 from '@/app/(sheets)/ai-pristanak';
import R19 from '@/app/(sheets)/brisanje';
import R20 from '@/app/(sheets)/izuzetak';
import R21 from '@/app/(sheets)/kupovina';

const routes: [string, ComponentType, string][] = [
  ['welcome', R0, 'screen-welcome'],
  ['ob prakse', R1, 'screen-ob-prakse'],
  ['ob alergije', R2, 'screen-ob-alergije'],
  ['ob sigurnost', R3, 'screen-ob-sigurnost'],
  ['ob dozvole', R4, 'screen-ob-dozvole'],
  ['ob nalog', R5, 'screen-ob-nalog'],
  ['danas', R6, 'screen-danas'],
  ['kalendar', R7, 'screen-kalendar'],
  ['plan', R8, 'screen-plan'],
  ['tajmer', R9, 'screen-tajmer'],
  ['profil', R10, 'screen-profil'],
  ['prakse', R11, 'screen-prakse'],
  ['alergije', R12, 'screen-alergije'],
  ['vaktija', R13, 'screen-vaktija'],
  ['privatnost', R14, 'screen-privatnost'],
  ['asistent', R15, 'screen-asistent'],
  ['nalog', R16, 'screen-nalog'],
  ['prijava-greske', R17, 'screen-prijava-greske'],
  ['ai-pristanak', R18, 'screen-ai-pristanak'],
  ['brisanje', R19, 'screen-brisanje'],
  ['izuzetak', R20, 'screen-izuzetak'],
  ['kupovina', R21, 'screen-kupovina'],
];

describe('route stubs', () => {
  it.each(routes)('%s renders its testID', async (_name, Screen, testID) => {
    await renderUI(<Screen />);
    expect(screen.getByTestId(testID)).toBeTruthy();
  });
});
