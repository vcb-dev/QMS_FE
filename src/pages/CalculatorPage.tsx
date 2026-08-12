import React from 'react';
import type { Role } from '../types';
import { PricingCalculatorView } from '../components/PricingCalculatorView';

interface CalculatorPageProps {
  currentRole: Role;
  onApplyToNewRequest: () => void;
}

export const CalculatorPage: React.FC<CalculatorPageProps> = ({
  currentRole,
  onApplyToNewRequest,
}) => {
  return (
    <PricingCalculatorView
      currentRole={currentRole}
      onApplyToNewRequest={onApplyToNewRequest}
    />
  );
};
