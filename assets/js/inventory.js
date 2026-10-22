/* inventory.js — Module G: IT inventory & documentation (uses the shared data table) */
(function (g) {
  'use strict';
  const ITK = g.ITK, U = ITK.util, esc = U.esc, ip = ITK.ip;
  const TYPES = ['Desktop Computer', 'Laptop', 'Printer', 'Scanner', 'Router', 'Switch', 'Access Point', 'Server', 'CCTV Camera', 'NVR / DVR', 'UPS', 'Other'];
  const STATUS = ['Active', 'In Stock', 'Under Repair', 'Retired', 'Lost / Missing'];

  ITK.register({
    id: 'inventory', cat: 'inventory', icon: 'box', title: 'IT Device Inventory',
    desc: 'Record computers, printers, network gear, servers and CCTV with IP, MAC, serial, user and warranty.',
    keywords: 'inventory asset device computer laptop printer router switch access point server cctv nvr dvr warranty serial',
    render: function (root) {
      const notice = U.alert('danger', '<strong>Do not store secrets here.</strong> Never enter passwords, recovery keys, Wi-Fi keys or other credentials in any field — inventory data is plain text and may be exported or saved unencrypted in this browser.') +
        U.alert('info', 'Tip: get a PC’s serial and model with <code>Get-CimInstance Win32_BIOS | Select SerialNumber</code> and <code>Get-CimInstance Win32_ComputerSystem | Select Manufacturer,Model</code> (see Windows Commands).');
      ITK.dataTable.create(root, {
        name: 'inventory', statKey: 'inv', csvFile: 'it-inventory', formTitle: 'Add or edit a device', listTitle: 'Devices', labelKey: 'name', unique: 'serial', sortKey: 'name',
        filter: { key: 'type', label: 'type' }, notice: notice, maxRows: 3000,
        emptyText: 'No devices yet. Add one above or import a CSV (use “CSV template” for the expected columns).',
        cellRender: {
          warrantyExpiry: function (v) {
            if (!v) return '';
            const days = Math.floor((Date.parse(v + 'T00:00:00') - Date.now()) / 86400000);
            const kind = days < 0 ? 'danger' : (days <= 60 ? 'warn' : 'success');
            return esc(v) + ' ' + U.badge(days < 0 ? 'Expired' : (days <= 60 ? days + ' days left' : 'In warranty'), kind);
          }
        },
        fields: [
          { key: 'name', label: 'Device name', required: true, max: 80, placeholder: 'PC-ACC-01' },
          { key: 'type', label: 'Device type', type: 'select', options: TYPES, required: true },
          { key: 'ip', label: 'IP address', mono: true, max: 15, placeholder: '192.168.1.25', validate: function (v) { const r = ip.parseIPv4(v); return r.ok ? null : r.error; } },
          { key: 'mac', label: 'MAC address', mono: true, max: 17, placeholder: 'AA:BB:CC:DD:EE:FF', normalize: function (v) { const m = ip.parseMAC(v); return m.ok ? m.colon : v; }, validate: function (v) { const m = ip.parseMAC(v); return m.ok ? null : m.error; } },
          { key: 'model', label: 'Model', max: 80 },
          { key: 'serial', label: 'Serial number', mono: true, max: 60, help: 'Must be unique when filled in.' },
          { key: 'user', label: 'Assigned user', max: 80 },
          { key: 'department', label: 'Department', max: 80 },
          { key: 'location', label: 'Location', max: 80 },
          { key: 'status', label: 'Status', type: 'select', options: STATUS, default: 'Active', required: true, badges: { Active: 'success', 'In Stock': 'info', 'Under Repair': 'warn', Retired: '', 'Lost / Missing': 'danger' } },
          { key: 'warrantyExpiry', label: 'Warranty expiry', type: 'date', hideInTable: false },
          { key: 'warrantyInfo', label: 'Warranty info', max: 120, placeholder: 'Vendor, 3 yrs, invoice no.', hideInTable: true },
          { key: 'remarks', label: 'Remarks', max: 200, hideInTable: true, wide: true }
        ]
      });
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);
