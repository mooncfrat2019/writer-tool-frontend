import { LegalPage } from './LegalPage';
import { offerDocument } from './documents/offer';

export function OfferPage() {
  return <LegalPage document={offerDocument} />;
}
