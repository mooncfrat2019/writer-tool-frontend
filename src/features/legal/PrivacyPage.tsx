import { LegalPage } from './LegalPage';
import { privacyDocument } from './documents/privacy';

export function PrivacyPage() {
  return <LegalPage document={privacyDocument} />;
}
