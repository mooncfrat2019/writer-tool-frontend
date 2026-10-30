import { useEffect } from 'react';

export function usePageMeta(title: string, description: string, noIndex = false): void {
  useEffect(() => {
    document.title = title;
    let descriptionTag = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!descriptionTag) {
      descriptionTag = document.createElement('meta');
      descriptionTag.name = 'description';
      document.head.appendChild(descriptionTag);
    }
    descriptionTag.content = description;

    let robotsTag = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (noIndex) {
      if (!robotsTag) {
        robotsTag = document.createElement('meta');
        robotsTag.name = 'robots';
        document.head.appendChild(robotsTag);
      }
      robotsTag.content = 'noindex,nofollow';
    } else {
      robotsTag?.remove();
    }
  }, [description, noIndex, title]);
}
