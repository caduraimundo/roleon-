import { useRouter } from 'next/navigation';

export function useSmartBack(fallback: string = '/') {
  const router = useRouter();

  const goBack = () => {
    if (
      typeof window !== 'undefined' &&
      window.history.length > 1 &&
      document.referrer.includes(window.location.hostname)
    ) {
      router.back();
    } else {
      router.push(fallback);
    }
  };

  return goBack;
}
