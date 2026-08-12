import React from 'react';
import type { QuoteRequest, Role, User } from '../types';
import { QuoteDetailView } from '../components/QuoteDetailView';
import { useNavigate } from 'react-router-dom';

interface DetailPageProps {
  selectedReq: QuoteRequest | null;
  currentRole: Role;
  currentUser: User;
  onEdit: (req: QuoteRequest) => void;
  onAccept: (id: string, version: number) => void;
  onPricing: (id: string) => void;
  onReject: (id: string) => void;
  onReturn?: (id: string) => void;
  onResubmit?: (id: string) => void;
  onSelectOption?: (reqId: string, optionId: string) => void;
  onConfirmDirectPrice?: (id: string, price: number) => Promise<void>;
}

export const DetailPage: React.FC<DetailPageProps> = ({
  selectedReq,
  currentRole,
  currentUser,
  onEdit,
  onAccept,
  onPricing,
  onReject,
  onReturn,
  onResubmit,
  onSelectOption,
  onConfirmDirectPrice,
}) => {
  const navigate = useNavigate();

  return (
    <QuoteDetailView
      selectedReq={selectedReq}
      currentRole={currentRole}
      currentUser={currentUser}
      onBack={() => navigate('/requests')}
      onEdit={onEdit}
      onAccept={onAccept}
      onPricing={onPricing}
      onReject={onReject}
      onReturn={onReturn}
      onResubmit={onResubmit}
      onSelectOption={onSelectOption}
      onConfirmDirectPrice={onConfirmDirectPrice}
    />
  );
};
