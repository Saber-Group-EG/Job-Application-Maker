import StatusHistoryActivitiesTab, { StatusHistoryActivitiesTabProps } from './StatusHistoryActivitiesTab';

export default function StatusHistoryActionsTab(props: Omit<StatusHistoryActivitiesTabProps, 'filter'>) {
  return <StatusHistoryActivitiesTab {...props} filter="actions" />;
}
