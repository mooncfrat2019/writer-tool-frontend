import { LegalPage } from './LegalPage';
import { termsDocument } from './documents/terms';

export function TermsPage() {
  return <LegalPage document={termsDocument} />;
}
