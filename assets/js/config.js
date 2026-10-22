/* config.js — OPTIONAL visitor analytics + admin dashboard.
   Leave analyticsEndpoint empty (default) and the site stays 100% static: nothing is ever sent anywhere and the admin page shows setup help only.
   To enable, deploy the Worker in /analytics (see analytics/README.md) and paste its URL here, e.g. 'https://itk-analytics.YOUR-NAME.workers.dev'. */
(function (g) {
  'use strict';
  g.ITK = g.ITK || {};
  g.ITK.config = {
    analyticsEndpoint: '',      // '' = analytics OFF
    consentMode: 'notice'       // 'notice' = count visits after showing a notice (visitor can opt out); 'optin' = count only after the visitor clicks Accept
  };
})(typeof window !== 'undefined' ? window : globalThis);
