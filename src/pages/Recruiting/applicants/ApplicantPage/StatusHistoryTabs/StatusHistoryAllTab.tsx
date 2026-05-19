import StatusHistoryActivitiesTab, { StatusHistoryActivitiesTabProps } from './StatusHistoryActivitiesTab';

export default function StatusHistoryAllTab(props: Omit<StatusHistoryActivitiesTabProps, 'filter'>) {
  return <StatusHistoryActivitiesTab {...props} filter="all" />;
}
