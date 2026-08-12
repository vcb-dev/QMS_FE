import React from 'react';
import type { QuoteRequest, Role } from '../types';
import { DashboardView } from '../components/DashboardView';
import { useNavigate } from 'react-router-dom';

interface DashboardPageProps {
  requests: QuoteRequest[];
  counts: {
    total: number;
    myReq: number;
    ycMoi: number;
    dangXly: number;
    needMoreInfo: number;
    xong: number;
    tuChoi: number;
  };
  currentRole: Role;
  onSelectReq: (id: string) => void;
  onOpenCreateModal?: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  requests,
  counts,
  currentRole,
  onSelectReq,
  onOpenCreateModal,
}) => {
  const navigate = useNavigate();

  return (
    <DashboardView
      requests={requests}
      counts={counts}
      currentRole={currentRole}
      onSelectReq={onSelectReq}
      onViewAll={() => navigate('/requests')}
      onOpenLibrary={() => navigate('/library')}
      onOpenCreateModal={onOpenCreateModal}
      onFilterChange={(filter) => {
        if (filter === 'LIBRARY') navigate('/library');
        else if (filter === 'CALCULATOR') navigate('/calculator');
        else navigate('/requests');
      }}
    />
  );
};
