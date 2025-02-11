/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { parse, equals as urlEquals } from "../../core/url";
import { clearTimeout, setTimeout } from "../../core/timers";
import { getDomainWithoutSuffix } from "../../core/tlds";
import { fetch, AbortController, Headers } from "../fetch";

// There needs to proper implementation, to avoid cases like:
// 1. Downloading streams.
// 2. Origin in web-extension.
export function getRequest(
  url,
  headers,
  onCompletedHandlerFinished = undefined,
) {
  if (
    chrome?.webDiscovery?.retrieveBackupResults !== undefined &&
    getDomainWithoutSuffix(url) == "google" &&
    url.includes("/search?")
  ) {
    return new Promise((resolve, reject) => {
      chrome.webDiscovery.retrieveBackupResults(url, (response) => {
        if (chrome.runtime.lastError || response?.responseCode !== 200) {
          console.error("Error retrieving backup results:", {
            err: chrome.runtime.lastError,
            response,
          });

          reject(
            new Error(
              `err=${chrome.runtime.lastError?.message}; response=${response}`,
            ),
          );
        } else {
          resolve({
            body: response.html,
            status: response.responseCode,
            headers: {},
            ok: true,
            redirected: false,
            url,
          });

          // Since the native API does not trigger onCompleted WebRequest events
          // we trigger it manually if we got a valid response.
          if (onCompletedHandlerFinished) {
            onCompletedHandlerFinished();
          }
        }
      });
    });
  }

  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async (resolve, reject) => {
    let timeout;
    try {
      const abortController = new AbortController();
      timeout = setTimeout(() => {
        timeout = null;
        reject(new Error("timeout"));
        abortController.abort();
      }, 10000);

      const response = await fetch(url, {
        credentials: "omit",
        cache: "no-cache",
        signal: abortController.signal,
        headers: new Headers(headers || {}),
      });

      if (response.status !== 200 && response.status !== 0 /* local files */) {
        reject(new Error(`status not valid: ${response.status}`));
        abortController.abort();
        return;
      }
      if (
        !urlEquals(response.url, url) &&
        !urlEquals(
          decodeURI(decodeURI(response.url)),
          decodeURI(decodeURI(url)),
        ) &&
        !urlEquals(url.replace(parse(url).hash, ""), response.url)
      ) {
        // there has been a redirect, we cannot guarantee that cookies were
        // not sent, therefore fail and consider as private
        reject(new Error(`DANGER: ${url} != ${response.url}`));
        abortController.abort();
        return;
      }

      resolve({
        body: await response.text(),
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        ok: response.ok,
        redirected: response.redirected,
        url: response.url,
      });
    } catch (e) {
      reject(e);
    } finally {
      if (timeout) {
        clearTimeout(timeout);
      }
    }
  });
}

export default getRequest;
