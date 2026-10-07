import { HttpHeaders, HttpResponse, type HttpInterceptorFn } from '@angular/common/http';
import { from, switchMap } from 'rxjs';
import { takePrefetched } from './prefetch';

/**
 * Answers a GET for JSON with the response `main.ts` prefetched for the same URL (embed/prefetch.ts), once. Without
 * one, or when it failed, the request goes out as usual.
 */
export const prefetchInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.method !== 'GET' || req.responseType !== 'json') return next(req);
  const answer = takePrefetched(req.urlWithParams);
  if (!answer) return next(req);
  return from(answer.then(async (res) => (res ? { res, text: await res.text() } : null)).catch(() => null)).pipe(
    switchMap((got) => {
      if (!got) return next(req);
      const names: Record<string, string> = {};
      got.res.headers.forEach((value, name) => (names[name] = value));
      const headers = new HttpHeaders(names);
      let body: unknown;
      try {
        body = got.text === '' ? null : JSON.parse(got.text);
      } catch {
        return next(req);
      }
      return [new HttpResponse({ body, headers, status: got.res.status, statusText: got.res.statusText, url: got.res.url || req.urlWithParams })];
    }),
  );
};
