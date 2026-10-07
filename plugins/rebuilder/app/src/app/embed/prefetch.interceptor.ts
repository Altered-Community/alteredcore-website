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
  return from(answer).pipe(
    switchMap((got) => {
      if (!got) return next(req);
      let body: unknown;
      try {
        body = got.body === '' ? null : JSON.parse(got.body);
      } catch {
        return next(req);
      }
      const headers = new HttpHeaders(got.headers);
      return [new HttpResponse({ body, headers, status: got.status, statusText: got.statusText, url: got.url || req.urlWithParams })];
    }),
  );
};
