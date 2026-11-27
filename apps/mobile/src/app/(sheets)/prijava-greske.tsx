import { useLocalSearchParams } from 'expo-router';
import { ReportForm } from '@/features/report/ReportForm';

export default function PrijavaGreskeScreen() {
  const { date, context, recipeId, mode } = useLocalSearchParams<{
    date?: string;
    context?: string;
    recipeId?: string;
    mode?: string;
  }>();
  return <ReportForm date={date} context={context} recipeId={recipeId} mode={mode} />;
}
