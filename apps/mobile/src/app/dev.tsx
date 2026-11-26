import { Redirect } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Body,
  Caption,
  Choice,
  Chip,
  Display,
  GlassCard,
  GlassChip,
  Icon,
  IconButton,
  LinkButton,
  Pill,
  PrimaryButton,
  ScreenScroll,
  SecondaryButton,
  Segmented,
  Switch,
  Title,
  useToast,
} from '@/components';
import { t } from '@/copy/sr';
import dev from '@/copy/sr/dev';
import { iconMap, type IconName } from '@/components/Icon';
import Auth from '@/features/dev/sections/auth';
import Notifications from '@/features/dev/sections/notifications';
import { level, type LevelKey } from '@/theme/tokens';

const d = (key: string) => dev[key] ?? key;
const levelKeys = Object.keys(level) as LevelKey[];
const iconNames = Object.keys(iconMap) as IconName[];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 10 }}>
      <Caption>{title}</Caption>
      {children}
    </View>
  );
}

function Gallery() {
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const [on, setOn] = useState(true);
  const [seg, setSeg] = useState<'a' | 'b'>('a');
  const [choice, setChoice] = useState(true);
  const [toggle, setToggle] = useState(false);

  return (
    <ScreenScroll testID="dev-gallery" bottomInset={insets.bottom}>
      <Display>{d('dev.title')}</Display>

      <Section title={d('dev.section.type')}>
        <Display>{d('dev.sampleDisplay')}</Display>
        <Title>{d('dev.sampleTitle')}</Title>
        <Body>{d('dev.sampleBody')}</Body>
        <Caption>{d('dev.sampleCaption')}</Caption>
      </Section>

      <Section title={d('dev.section.glass')}>
        <GlassCard contentStyle={{ padding: 18 }}>
          <Title>{d('dev.glassCard')}</Title>
        </GlassCard>
        <View style={{ flexDirection: 'row' }}>
          <GlassChip contentStyle={{ paddingHorizontal: 14, paddingVertical: 8 }}>
            <Body>{d('dev.glassChip')}</Body>
          </GlassChip>
        </View>
      </Section>

      <Section title={d('dev.section.buttons')}>
        <PrimaryButton label={d('dev.primary')} testID="dev-primary" />
        <PrimaryButton label={d('dev.disabled')} disabled />
        <SecondaryButton label={d('dev.secondary')} />
        <LinkButton label={d('dev.link')} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <IconButton icon="back" accessibilityLabel={t('common.back')} />
          <IconButton icon="close" accessibilityLabel={t('common.close')} />
        </View>
      </Section>

      <Section title={d('dev.section.controls')}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Body>{d('dev.switch')}</Body>
          <Switch value={on} onValueChange={setOn} accessibilityLabel={d('dev.switch')} testID="dev-switch" />
        </View>
        <Segmented
          items={[
            { key: 'a', label: d('dev.segA') },
            { key: 'b', label: d('dev.segB') },
          ]}
          value={seg}
          onChange={setSeg}
        />
        <Choice
          title={d('dev.choiceTitle')}
          description={d('dev.choiceDesc')}
          checked={choice}
          onPress={() => setChoice((v) => !v)}
        />
      </Section>

      <Section title={d('dev.section.chips')}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Chip variant="yes" label={d('dev.chipYes')} />
          <Chip variant="no" label={d('dev.chipNo')} />
          <Chip variant="toggle" label={d('dev.chipToggle')} selected={toggle} onPress={() => setToggle((v) => !v)} />
          <Chip variant="add" label={d('dev.chipAdd')} onPress={() => undefined} />
          <Chip variant="remove" label={d('dev.chipRemove')} onPress={() => undefined} />
          <Chip variant="readonly" label={d('dev.chipReadonly')} />
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {levelKeys.map((k) => (
            <Pill key={k} level={k} />
          ))}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {levelKeys.map((k) => (
            <Pill key={`s-${k}`} level={k} solid />
          ))}
          <Pill tone="teal" label={d('dev.pillTone')} />
          <Pill tone="ember" label={d('dev.pillTone')} />
        </View>
      </Section>

      <Section title={d('dev.section.icons')}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 18 }}>
          {iconNames.map((n) => (
            <Icon key={n} name={n} size={24} />
          ))}
        </View>
      </Section>

      <Section title={d('dev.section.toast')}>
        <SecondaryButton label={d('dev.toastShow')} onPress={() => toast.show(t('common.saved'))} testID="dev-toast" />
      </Section>

      <Notifications />

      <Auth />
    </ScreenScroll>
  );
}

export default function Dev() {
  if (!__DEV__) return <Redirect href="/" />;
  return <Gallery />;
}
