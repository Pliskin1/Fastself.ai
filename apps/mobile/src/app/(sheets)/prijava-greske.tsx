import { useLocalSearchParams } from 'expo-router';
import { ReportForm } from '@/features/report/ReportForm';

export default function PrijavaGreskeScreen() {
  const { date, context } = useLocalSearchParams<{ date?: string; context?: string }>();
  return <ReportForm date={date} context={context} />;
}
