import { useCallback, useRef, useState } from 'react';

export default function usePageLoad() {
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [pageInitialized, setPageInitialized] = useState(false);
  const pending = useRef(0);
  const requestId = useRef(0);
  const runPageLoad = useCallback(async (request) => {
    const id = ++requestId.current;
    pending.current += 1;
    setPageLoading(true);
    setPageError('');
    try {
      return await request();
    } catch (error) {
      if (id === requestId.current) setPageError('Não foi possível carregar os dados. Tente novamente.');
    } finally {
      pending.current -= 1;
      if (pending.current === 0) { setPageLoading(false); setPageInitialized(true); }
    }
  }, []);
  return { pageLoading, pageError, pageInitialized, runPageLoad };
}
