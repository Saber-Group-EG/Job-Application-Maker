import StatusHistoryActivitiesTab, { StatusHistoryActivitiesTabProps } from './StatusHistoryActivitiesTab';

export default function StatusHistoryInterviewTab(props: Omit<StatusHistoryActivitiesTabProps, 'filter'>) {
  return <StatusHistoryActivitiesTab {...props} filter="interview" />;
}
