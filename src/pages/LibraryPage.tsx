import React from 'react';
import type { Material, ProductCategory, QuoteRequest } from '../types';
import { ProductLibraryView } from '../components/ProductLibraryView';

interface LibraryPageProps {
  requests: QuoteRequest[];
  categories: ProductCategory[];
  materials: Material[];
  onSelectReq: (id: string) => void;
  selectedId?: string | null;
  totalCount: number;
}

export const LibraryPage: React.FC<LibraryPageProps> = ({
  requests,
  categories,
  materials,
  onSelectReq,
  selectedId,
  totalCount,
}) => {
  return (
    <ProductLibraryView
      requests={requests}
      categories={categories}
      materials={materials}
      onSelectReq={onSelectReq}
      selectedId={selectedId}
      totalCount={totalCount}
    />
  );
};
