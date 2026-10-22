/* command-library.js — Module C: searchable Windows CMD / PowerShell command library (copy only; nothing is executed) */
(function (g) {
  'use strict';
  const ITK = g.ITK, U = ITK.util, esc = U.esc;
  const A = 'Administrator', S = 'Standard user';
  const CMDS = [];
  /* c(name, syntax, shell, category, purpose, when, privileges, risk, warning) ; risk: safe | caution | disruptive */
  function c(name, cmd, shell, cat, purpose, when, priv, risk, warn) {
    CMDS.push({ name: name, cmd: cmd, shell: shell, cat: cat, purpose: purpose, when: when, priv: priv, risk: risk, warn: warn || '' });
  }
  const CMD = 'CMD', PS = 'PowerShell', BOTH = 'CMD / PowerShell';

  /* ---- Network ---- */
  c('ipconfig', 'ipconfig', BOTH, 'Network', 'Shows IP address, subnet mask and default gateway for each adapter.', 'First check for any connectivity problem.', S, 'safe');
  c('ipconfig /all', 'ipconfig /all', BOTH, 'Network', 'Shows full details: MAC, DHCP server, lease times, DNS servers, hostname.', 'To verify DHCP vs static, DNS servers and MAC for inventory.', S, 'safe');
  c('ipconfig /flushdns', 'ipconfig /flushdns', BOTH, 'Network', 'Clears the local DNS resolver cache.', 'A site/server resolves to an old or wrong address.', S, 'safe', 'Harmless; the cache rebuilds automatically.');
  c('ipconfig /displaydns', 'ipconfig /displaydns', BOTH, 'Network', 'Shows the contents of the DNS cache.', 'To see stale or wrong cached records.', S, 'safe');
  c('ipconfig /release', 'ipconfig /release', BOTH, 'Network', 'Releases the DHCP lease so the adapter has no IP address.', 'Only when you plan to renew immediately, e.g. after moving to a different network/VLAN.', A, 'disruptive', 'Drops the PC’s network connection at once. Never run it over a remote session (RDP/remote tools) — you will lose access. Run /renew right after.');
  c('ipconfig /renew', 'ipconfig /renew', BOTH, 'Network', 'Asks the DHCP server for a new or renewed lease.', 'After /release, or when stuck on 169.254.x.x.', A, 'caution', 'Briefly interrupts the connection while the lease is renewed.');
  c('ipconfig /registerdns', 'ipconfig /registerdns', BOTH, 'Network', 'Refreshes DHCP leases and re-registers the PC’s name in DNS.', 'Domain PC not resolving by name after an IP change.', A, 'caution', 'May briefly affect name resolution for this PC.');
  c('ping', 'ping 8.8.8.8', BOTH, 'Network', 'Tests reachability and round-trip time with ICMP echo.', 'Check the gateway, a public IP, or a server.', S, 'safe', 'A failed ping does not always mean the host is down — firewalls may block ICMP. Replace the example address with your target.');
  c('ping -t (continuous)', 'ping -t <gateway-ip>', BOTH, 'Network', 'Pings continuously until you press Ctrl+C.', 'Watching for intermittent drops.', S, 'safe', 'Press Ctrl+C to stop and view statistics.');
  c('ping -n (count)', 'ping -n 50 8.8.8.8', BOTH, 'Network', 'Sends a fixed number of pings and prints loss statistics.', 'Measuring packet loss and latency.', S, 'safe');
  c('ping MTU test', 'ping -f -l 1472 8.8.8.8', CMD, 'Network', 'Sends a don’t-fragment packet of 1472 bytes to test the path MTU (1472 + 28 = 1500).', 'Suspected MTU/VPN fragmentation issues.', S, 'safe', 'If you get “Packet needs to be fragmented”, lower the size until it works.');
  c('tracert', 'tracert 8.8.8.8', BOTH, 'Network', 'Shows each router hop to a destination with timing.', 'Find where latency or loss begins.', S, 'safe', 'Hops showing * may simply not answer ICMP.');
  c('pathping', 'pathping 8.8.8.8', BOTH, 'Network', 'Combines tracert and ping; measures loss per hop.', 'Diagnosing packet loss.', S, 'safe', 'Takes about 5 minutes to finish.');
  c('nslookup', 'nslookup google.com', BOTH, 'Network', 'Queries DNS for a name.', 'Names do not resolve.', S, 'safe');
  c('nslookup (specific DNS server)', 'nslookup google.com 8.8.8.8', BOTH, 'Network', 'Queries a chosen DNS server instead of the default.', 'Compare your DNS with a public DNS to find a DNS fault.', S, 'safe');
  c('nslookup MX record', 'nslookup -type=mx example.com', BOTH, 'Network', 'Looks up mail servers for a domain.', 'Email delivery troubleshooting.', S, 'safe');
  c('arp -a', 'arp -a', BOTH, 'Network', 'Shows the IP-to-MAC table (ARP cache).', 'Detect IP conflicts; find a device’s MAC.', S, 'safe');
  c('arp -d * (clear ARP cache)', 'arp -d *', CMD, 'Network', 'Clears the ARP cache.', 'Stale MAC entry after replacing a router or device.', A, 'caution', 'May cause a brief pause as entries are re-learned.');
  c('route print', 'route print', BOTH, 'Network', 'Displays the routing table.', 'Check the default route and VPN routes.', S, 'safe', 'Do not use route add/delete unless you know the effect — wrong routes can cut off connectivity.');
  c('netstat -ano', 'netstat -ano', BOTH, 'Network', 'Lists connections and listening ports with owning process IDs.', 'See which program uses a port.', S, 'safe', 'Match the PID with tasklist.');
  c('netstat -an (listening)', 'netstat -an | findstr LISTENING', CMD, 'Network', 'Lists only ports that are listening.', 'Check whether a service is listening.', S, 'safe');
  c('getmac', 'getmac /v', CMD, 'Network', 'Shows MAC addresses for all adapters.', 'Recording MACs for inventory/DHCP reservations.', S, 'safe');
  c('Show Wi-Fi interface', 'netsh wlan show interfaces', CMD, 'Network', 'Shows Wi-Fi state, SSID, signal and band.', 'Weak signal or roaming problems.', S, 'safe');
  c('Wi-Fi report', 'netsh wlan show wlanreport', CMD, 'Network', 'Creates an HTML report of Wi-Fi sessions and failures.', 'Intermittent Wi-Fi disconnects.', A, 'safe');
  c('Show saved Wi-Fi profiles', 'netsh wlan show profiles', CMD, 'Network', 'Lists saved Wi-Fi networks.', 'Forgetting wrong profiles.', S, 'safe', 'Do not reveal saved Wi-Fi keys on other people’s PCs without authorisation.');
  c('Show interface IP config', 'netsh interface ip show config', CMD, 'Network', 'Shows IP configuration per interface (static/DHCP).', 'Check whether an adapter is static or DHCP.', S, 'safe');
  c('netsh winsock reset', 'netsh winsock reset', CMD, 'Network', 'Resets the Winsock catalog to defaults.', 'Last resort for odd socket/connectivity errors after malware removal.', A, 'disruptive', 'Requires a restart and can remove custom network software hooks (VPN/filters). Try simpler checks first.');
  c('netsh int ip reset', 'netsh int ip reset', CMD, 'Network', 'Resets the TCP/IP stack to default.', 'Last resort for a corrupt TCP/IP stack.', A, 'disruptive', 'Wipes static IP configuration and requires a restart. Note current settings first (ipconfig /all).');
  c('net use (list mappings)', 'net use', CMD, 'Network', 'Lists mapped network drives and connections.', 'Shared folder access problems.', S, 'safe');
  c('net view', 'net view \\\\<server>', CMD, 'Network', 'Lists shares on a server/PC.', 'Check whether a share is published.', S, 'safe');
  c('Test-NetConnection (port test)', 'Test-NetConnection <host> -Port 445', PS, 'Network', 'Tests TCP connectivity to a host and port.', 'Check SMB (445), RDP (3389), printer (9100) or web ports.', S, 'safe');
  c('Get-NetIPConfiguration', 'Get-NetIPConfiguration', PS, 'Network', 'Shows IP, gateway and DNS per interface in a readable format.', 'Quick adapter overview.', S, 'safe');
  c('Get-NetAdapter', 'Get-NetAdapter', PS, 'Network', 'Lists network adapters with status and link speed.', 'Check link speed (100 Mbps vs 1 Gbps).', S, 'safe');
  c('Resolve-DnsName', 'Resolve-DnsName google.com', PS, 'Network', 'PowerShell DNS lookup.', 'Alternative to nslookup.', S, 'safe');
  c('Get-NetTCPConnection', 'Get-NetTCPConnection -State Listen', PS, 'Network', 'Lists TCP connections/listeners.', 'Port usage investigation.', S, 'safe');

  /* ---- System ---- */
  c('hostname', 'hostname', BOTH, 'System', 'Prints the computer name.', 'Asset records and remote support.', S, 'safe');
  c('whoami', 'whoami', BOTH, 'System', 'Shows the current domain\\user.', 'Check which account is signed in.', S, 'safe');
  c('whoami /groups', 'whoami /groups', BOTH, 'System', 'Lists the groups of the current user.', 'Permission problems.', S, 'safe');
  c('systeminfo', 'systeminfo', BOTH, 'System', 'Shows OS version, install date, uptime, RAM, hotfixes and network cards.', 'Collecting system details for support or inventory.', S, 'safe', 'May take several seconds.');
  c('Get-ComputerInfo', 'Get-ComputerInfo', PS, 'System', 'Detailed system and OS information as objects.', 'Inventory or deeper diagnosis.', S, 'safe');
  c('Serial number (BIOS)', 'Get-CimInstance Win32_BIOS | Select-Object SerialNumber', PS, 'System', 'Reads the BIOS serial number.', 'Filling the Inventory serial number field.', S, 'safe', 'Some custom PCs report a placeholder like “To be filled by O.E.M.”.');
  c('Model and manufacturer', 'Get-CimInstance Win32_ComputerSystem | Select-Object Manufacturer,Model', PS, 'System', 'Shows manufacturer and model.', 'Inventory and driver lookup.', S, 'safe');
  c('Installed RAM modules', 'Get-CimInstance Win32_PhysicalMemory | Select-Object Capacity,Speed,Manufacturer', PS, 'System', 'Lists memory modules and sizes (bytes).', 'Planning an upgrade.', S, 'safe');
  c('tasklist', 'tasklist', BOTH, 'System', 'Lists running processes with PIDs and memory.', 'Find resource-hungry processes.', S, 'safe');
  c('taskkill', 'taskkill /PID <pid> /F', CMD, 'System', 'Force-ends a process by PID.', 'A hung application will not close.', S, 'caution', 'Unsaved work in that program is lost. Never end system processes you do not recognise.');
  c('gpupdate /force', 'gpupdate /force', BOTH, 'System', 'Refreshes Group Policy immediately.', 'After a policy change on a domain PC.', S, 'caution', 'May prompt to log off or restart if policies need it.');
  c('gpresult', 'gpresult /r', CMD, 'System', 'Shows which Group Policy objects apply to the user/computer.', 'Troubleshooting policy-related issues.', S, 'safe', 'Use /scope computer from an elevated prompt for computer policies.');
  c('Event Viewer', 'eventvwr.msc', BOTH, 'System', 'Opens Event Viewer.', 'Read system/application errors.', S, 'safe');
  c('Services console', 'services.msc', BOTH, 'System', 'Opens the Services list.', 'Check/restart services.', S, 'safe');
  c('Device Manager', 'devmgmt.msc', BOTH, 'System', 'Opens Device Manager.', 'Driver and hardware errors.', S, 'safe');
  c('Disk Management', 'diskmgmt.msc', BOTH, 'System', 'Opens Disk Management.', 'Drives without letters, new disks.', S, 'safe', 'Be careful: formatting or deleting a volume destroys data.');
  c('Installed updates', 'Get-HotFix', PS, 'System', 'Lists installed Windows updates (KB).', 'Check whether a patch is installed.', S, 'safe');
  c('Windows version', 'winver', BOTH, 'System', 'Shows Windows version and build.', 'Compatibility checks.', S, 'safe');
  c('Memory diagnostic', 'mdsched.exe', BOTH, 'System', 'Schedules Windows Memory Diagnostic.', 'Suspected faulty RAM/BSOD.', A, 'caution', 'Offers to restart immediately — save your work first.');

  /* ---- Repair & disk ---- */
  c('sfc /scannow', 'sfc /scannow', CMD, 'Repair & Disk', 'Scans and repairs protected Windows system files.', 'Windows is unstable, crashes or has missing files.', A, 'caution', 'Takes 10–30 minutes. Do not close the window. Run DISM first if sfc reports it could not fix files.');
  c('DISM CheckHealth', 'DISM /Online /Cleanup-Image /CheckHealth', CMD, 'Repair & Disk', 'Quickly checks whether the component store is flagged as corrupt.', 'Before a deeper repair.', A, 'safe');
  c('DISM ScanHealth', 'DISM /Online /Cleanup-Image /ScanHealth', CMD, 'Repair & Disk', 'Scans the component store for corruption.', 'Update failures or sfc errors.', A, 'safe', 'Can take several minutes.');
  c('DISM /Online /Cleanup-Image /RestoreHealth', 'DISM /Online /Cleanup-Image /RestoreHealth', CMD, 'Repair & Disk', 'Repairs the Windows component store using Windows Update.', 'sfc cannot repair files, or Windows Update keeps failing.', A, 'caution', 'Needs internet (or a repair source), takes 10–30 min, and may appear stuck near 20% or 62% — wait. Run sfc /scannow afterwards.');
  c('chkdsk (read-only)', 'chkdsk C:', CMD, 'Repair & Disk', 'Checks the file system without making changes.', 'Suspected file-system errors.', A, 'safe', 'Read-only mode reports problems but does not fix them.');
  c('chkdsk /f', 'chkdsk C: /f', CMD, 'Repair & Disk', 'Fixes file-system errors on the volume.', 'After chkdsk reports errors and data is backed up.', A, 'caution', 'On the system drive it runs at next restart and may take long. Back up first, and avoid on a failing disk.');
  c('chkdsk /r', 'chkdsk C: /r', CMD, 'Repair & Disk', 'Locates bad sectors and recovers readable data (includes /f).', 'Suspected bad sectors, with a current backup.', A, 'caution', 'Can take hours and stress a failing disk. Back up first.');
  c('Disk health', 'Get-PhysicalDisk | Select-Object FriendlyName,MediaType,HealthStatus,OperationalStatus', PS, 'Repair & Disk', 'Shows disk health status.', 'Slow PC, disk errors.', S, 'safe');
  c('Volumes and free space', 'Get-Volume', PS, 'Repair & Disk', 'Lists volumes with size and free space.', 'Low disk space checks.', S, 'safe');
  c('powercfg /batteryreport', 'powercfg /batteryreport', BOTH, 'Repair & Disk', 'Creates an HTML battery report (capacity, cycles, usage).', 'Laptop battery health check.', S, 'safe', 'The output path is printed (usually battery-report.html in the current folder).');
  c('powercfg /energy', 'powercfg /energy', BOTH, 'Repair & Disk', 'Analyses power efficiency for 60 seconds and writes energy-report.html.', 'Battery drain, sleep problems.', A, 'safe', 'Keep the PC idle during the test.');

  /* ---- Printing ---- */
  c('List printers', 'Get-Printer | Select-Object Name,PrinterStatus,PortName,DriverName', PS, 'Printing', 'Lists printers with status, port and driver.', 'Printer offline or wrong port.', S, 'safe');
  c('Show print jobs', 'Get-PrintJob -PrinterName "<printer name>"', PS, 'Printing', 'Shows queued jobs for a printer.', 'Stuck print queue.', S, 'safe');
  c('Spooler status', 'Get-Service Spooler', PS, 'Printing', 'Shows whether the Print Spooler service is running.', 'Printing fails for all printers.', S, 'safe');
  c('Stop spooler', 'net stop spooler', CMD, 'Printing', 'Stops the Print Spooler service.', 'First step to clear a stuck queue.', A, 'caution', 'Printing stops for everyone using this computer as a print host.');
  c('Clear spool files', 'del /Q /F /S "%systemroot%\\System32\\spool\\PRINTERS\\*.*"', CMD, 'Printing', 'Deletes spooled print jobs.', 'After stopping the spooler, to clear stuck jobs.', A, 'caution', 'Removes ALL pending print jobs. Only run after net stop spooler.');
  c('Start spooler', 'net start spooler', CMD, 'Printing', 'Starts the Print Spooler service.', 'After clearing the queue.', A, 'safe');
  c('Restart spooler (PowerShell)', 'Restart-Service Spooler', PS, 'Printing', 'Restarts the spooler in one step.', 'Quick spooler reset.', A, 'caution', 'Pending jobs may be lost or reprinted.');
  c('Print server properties', 'printui.exe /s /t2', BOTH, 'Printing', 'Opens print server properties on the Drivers tab.', 'Remove/inspect printer drivers.', A, 'safe');

  /* ---- Users & accounts ---- */
  c('net user', 'net user <username>', CMD, 'Users', 'Shows local account details.', 'Check local account state and last password set.', S, 'safe');
  c('net user (domain)', 'net user <username> /domain', CMD, 'Users', 'Shows domain account details (expiry, lockout, groups).', 'User cannot log in; check account expiry or lockout.', S, 'safe', 'Requires a domain-joined PC.');
  c('Local administrators', 'net localgroup administrators', CMD, 'Users', 'Lists local administrators.', 'Security review of admin rights.', S, 'safe');
  c('Logged-on users', 'quser', CMD, 'Users', 'Lists user sessions on this computer.', 'Check who is logged on (terminal/RDP servers).', S, 'safe');
  c('Windows Update service', 'Get-Service wuauserv', PS, 'Users', 'Shows the Windows Update service status.', 'Update problems.', S, 'safe');

  ITK.data.commands = CMDS;

  function hay(x) { return [x.name, x.cmd, x.purpose, x.when, x.cat, x.shell, x.warn].join(' ').toLowerCase(); }
  const RISK = { safe: ['Read-only / safe', 'success'], caution: ['Use with care', 'warn'], disruptive: ['May interrupt connectivity / change configuration', 'danger'] };

  ITK.register({
    id: 'commands', cat: 'commands', icon: 'terminal', title: 'Windows CMD & PowerShell Helper',
    desc: 'Searchable library of ' + CMDS.length + ' commands with purpose, privileges, warnings and a Copy button.',
    keywords: 'cmd powershell command ipconfig ping tracert nslookup sfc dism chkdsk netstat arp route gpupdate tasklist',
    render: function (root, params) {
      const cats = ['All'].concat(CMDS.map(function (x) { return x.cat; }).filter(function (v, i, a) { return a.indexOf(v) === i; }));
      root.innerHTML = U.alert('warn', '<strong>Copy only — nothing is executed.</strong> This website never runs commands. Copy a command, paste it into Command Prompt or PowerShell on a computer you are <em>authorised</em> to manage, and read the warning first. Replace <code>&lt;placeholders&gt;</code> with real values.') +
        '<div class="card"><div class="inline-fields"><div class="field"><label for="cq">Search commands</label><input class="input" id="cq" type="search" placeholder="e.g. flushdns, disk, printer, wifi" autocomplete="off" value="' + esc(params.q || '') + '"></div>' +
        '<div class="field"><label for="cc">Category</label><select class="select" id="cc">' + cats.map(function (x) { return '<option>' + esc(x) + '</option>'; }).join('') + '</select></div>' +
        '<div class="field"><label for="cs">Shell</label><select class="select" id="cs"><option>All</option><option>CMD</option><option>PowerShell</option></select></div></div><p class="muted" id="ccount" style="margin:8px 0 0" aria-live="polite"></p></div><div id="clist"></div>';
      const q = U.$('#cq', root), cc = U.$('#cc', root), cs = U.$('#cs', root), list = U.$('#clist', root), count = U.$('#ccount', root);
      function draw() {
        const toks = q.value.toLowerCase().split(/\s+/).filter(Boolean);
        const shown = CMDS.filter(function (x) {
          if (cc.value !== 'All' && x.cat !== cc.value) return false;
          if (cs.value !== 'All' && x.shell.indexOf(cs.value) === -1) return false;
          const h = hay(x); return toks.every(function (t) { return h.indexOf(t) !== -1; });
        });
        count.textContent = shown.length + ' of ' + CMDS.length + ' commands';
        list.innerHTML = shown.length ? shown.map(function (x) {
          const r = RISK[x.risk];
          return '<article class="cmd-card"><h3>' + esc(x.name) + ' ' + U.badge(x.shell, 'info') + ' ' + U.badge(r[0], r[1]) + (x.priv === A ? ' ' + U.badge('Run as Administrator', 'warn') : '') + '</h3>' + U.codebox(x.cmd) +
            '<dl class="cmd-meta"><dt>Purpose</dt><dd>' + esc(x.purpose) + '</dd><dt>When to use</dt><dd>' + esc(x.when) + '</dd><dt>Privileges</dt><dd>' + (x.priv === A ? 'Administrator (open CMD/PowerShell with “Run as administrator”)' : 'Standard user is enough') + '</dd>' +
            (x.warn ? '<dt>Warning</dt><dd>' + esc(x.warn) + '</dd>' : '') + '</dl></article>';
        }).join('') : '<div class="empty card">No commands match your search. Try a shorter keyword like “dns” or “disk”, or set Category/Shell to All.</div>';
      }
      [q].forEach(function (e) { e.addEventListener('input', U.debounce(draw, 120)); });
      cc.addEventListener('change', draw); cs.addEventListener('change', draw);
      draw();
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);
