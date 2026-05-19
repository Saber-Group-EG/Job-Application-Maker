import StatusHistoryActivitiesTab, { StatusHistoryActivitiesTabProps } from './StatusHistoryActivitiesTab';

export default function StatusHistoryStatusTab(props: Omit<StatusHistoryActivitiesTabProps, 'filter'>) {
  return <StatusHistoryActivitiesTab {...props} filter="status" />;
}
