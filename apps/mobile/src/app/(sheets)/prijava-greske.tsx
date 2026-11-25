import { useLocalSearchParams } from 'expo-router';
import { ReportForm } from '@/features/report/ReportForm';

export default function PrijavaGreskeScreen() {
  const { date, context, recipeId } = useLocalSearchParams<{ date?: string; context?: string; recipeId?: string }>();
  return <ReportForm date={date} context={context} recipeId={recipeId} />;
}
