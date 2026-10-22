/* troubleshooting.js — Modules B, E, F: step-by-step guides (network, hardware/Windows, printers & peripherals) */
(function (g) {
  'use strict';
  const ITK = g.ITK, U = ITK.util, esc = U.esc;
  const GUIDES = [];
  /* G(cat, id, title, bn, desc, symptoms, causes, steps[[text, cmd?, expected?]], fixes, escalate, warnings) */
  function G(cat, id, title, bn, desc, symptoms, causes, steps, fixes, escalate, warnings) {
    GUIDES.push({ cat: cat, id: id, title: title, bn: bn, desc: desc, symptoms: symptoms, causes: causes, steps: steps, fixes: fixes, escalate: escalate, warnings: warnings || [] });
  }
  const PING_GW = 'ping <gateway-ip>';

  /* ================= NETWORK (Module B) ================= */
  G('network', 'no-internet', 'No Internet Connection',
    'কম্পিউটারে ইন্টারনেট না থাকলে আগে ক্যাবল/Wi-Fi ও লাইট দেখুন, তারপর ipconfig দিয়ে IP দেখুন এবং Gateway ও 8.8.8.8 ping করুন। একাধিক ইউজারের সমস্যা হলে ISP বা সিনিয়র ইঞ্জিনিয়ারকে জানান।',
    'The device shows no network or internet and no website or online app loads.',
    ['Network icon shows a red X, globe or “No internet”', 'All websites and online apps fail', 'Link light off on the LAN port'],
    ['Cable unplugged or Wi-Fi/Airplane mode on', 'Network adapter disabled or driver problem', 'Switch/router/modem down or port fault', 'ISP outage'],
    [['Check the physical layer: Wi-Fi/Airplane mode, cable seated at both ends, link lights on the PC port and the switch/router port.'],
     ['Look at the adapter state.', 'ipconfig', '“Media disconnected” means no link (cable/Wi-Fi). An IP in your LAN range means the link is up.'],
     ['Check whether other devices on the same network have internet. This separates a single-PC problem from a network or ISP problem.'],
     ['View full IP settings.', 'ipconfig /all', 'IPv4 address in your LAN range, a Default Gateway and DNS servers. 169.254.x.x means DHCP failed (see the DHCP guide).'],
     ['Ping the default gateway.', PING_GW, 'Replies with low time (usually <5 ms on LAN).'],
     ['Ping a public IP to test routing without DNS.', 'ping 8.8.8.8', 'Replies. If this works but websites do not, go to the DNS guide.'],
     ['Look at modem/router lights (power, WAN/Internet, PON/LOS on fibre). A red LOS/WAN light points to the ISP line.']],
    ['Re-enable the adapter (Network Connections → right-click → Enable), or reseat/replace the cable and try another port.', 'Reboot the PC to clear a stuck driver state.', 'If the whole office is down, power-cycle the modem first, then the router, once you have approval.'],
    ['More than one user or location is affected.', 'Modem WAN/PON/LOS light is red or off.', 'Gateway answers but nothing beyond it does for everyone (ISP).', 'Suspected faulty switch/router hardware.'],
    ['Restarting the router/modem disconnects every user — inform people first.', 'Do not factory-reset network equipment as a “test”.']);

  G('network', 'connected-no-internet', 'Connected but No Internet',
    'Wi-Fi/LAN “Connected” দেখালেও ইন্টারনেট না চললে gateway ping করুন, তারপর 8.8.8.8 এবং কোনো ডোমেইন (যেমন google.com) ping করে দেখুন। IP চললে কিন্তু নাম না চললে DNS সমস্যা; proxy/captive portal-ও চেক করুন।',
    'The device has a valid IP and shows “Connected”, but pages do not load or Windows reports “No internet access”.',
    ['“Connected, no internet” / yellow triangle', 'Some apps work, browsers do not (or the reverse)', 'Works on other devices'],
    ['DNS servers unreachable or wrong', 'Upstream link/ISP failure behind the router', 'Captive portal or proxy settings', 'Wrong gateway/IP (static config) or IP conflict', 'Firewall/security software blocking'],
    [['Check IP settings.', 'ipconfig /all', 'Correct IP/mask/gateway/DNS for your network.'],
     ['Ping the gateway.', PING_GW, 'Replies.'],
     ['Ping a public IP.', 'ping 8.8.8.8', 'Replies → routing is fine.'],
     ['Ping a name.', 'ping google.com', 'Replies with an IP. “could not find host” = DNS problem.'],
     ['Test DNS directly.', 'nslookup google.com', 'Returns an address from your DNS server.'],
     ['Check proxy: Settings → Network & Internet → Proxy. Disable “Use a proxy server” unless your office requires one.'],
     ['Open http://neverssl.com in a browser to trigger a captive-portal login page if one exists.'],
     ['Test with another browser/profile and with VPN or third-party security software temporarily disabled (if policy allows).']],
    ['Fix wrong DNS/gateway values or switch the adapter back to automatic (DHCP).', 'Clear DNS cache with ipconfig /flushdns.', 'Re-authenticate to the captive portal.'],
    ['Gateway cannot reach 8.8.8.8 for every device (ISP/router).', 'Only specific sites fail across devices (routing/firewall).'],
    ['Do not disable the firewall permanently; test briefly and re-enable.']);

  G('network', 'dns-failure', 'DNS Resolution Failure',
    'IP দিয়ে ping চললে কিন্তু নাম দিয়ে না চললে DNS সমস্যা। nslookup দিয়ে পরীক্ষা করুন, ipconfig /flushdns চালান এবং DNS সার্ভার ঠিক আছে কিনা দেখুন।',
    'Names do not resolve to IP addresses, so sites fail while pinging an IP works.',
    ['“DNS_PROBE_FINISHED_NO_INTERNET”, “server IP address could not be found”', 'ping 8.8.8.8 works but ping google.com fails', 'Internal servers reachable by IP but not by name'],
    ['DNS server down, unreachable or wrong', 'Stale DNS cache', 'Wrong DNS suffix/domain settings', 'Router DNS proxy fault', 'Hosts file or security software interfering'],
    [['Confirm IP connectivity.', 'ping 8.8.8.8', 'Replies.'],
     ['Check which DNS servers are used.', 'ipconfig /all', 'DNS Servers listed are your router/AD DNS or ISP DNS.'],
     ['Query the default DNS.', 'nslookup google.com', 'Server name and address shown, plus an answer.'],
     ['Query a specific DNS server to compare.', 'nslookup google.com 8.8.8.8', 'Works with 8.8.8.8 but not default → your DNS server is the problem.'],
     ['Check the local hosts file for odd entries (C:\\Windows\\System32\\drivers\\etc\\hosts).'],
     ['Look at what is cached.', 'ipconfig /displaydns', 'Stale or wrong entries for the target site.']],
    ['Flush the cache.', 'Set a working DNS temporarily (adapter properties → IPv4 → DNS) — follow your company policy; internal domains need the internal DNS.', 'Restart the DNS client or the router DNS service.'],
    ['Internal AD/DNS server not answering (escalate to the server/network team).', 'Public DNS fails for all users.'],
    ['Do not replace internal DNS with public DNS on domain-joined PCs — domain logon and internal names will break.']);
  GUIDES[GUIDES.length - 1].steps[5][1] = 'ipconfig /displaydns';
  GUIDES[GUIDES.length - 1].fixes[0] = 'Flush the cache with ipconfig /flushdns (safe; run in Command Prompt).';

  G('network', 'ip-conflict', 'IP Address Conflict',
    'দুটি ডিভাইস একই IP পেলে conflict হয়। arp -a দিয়ে অন্য ডিভাইসের MAC দেখুন, DHCP lease/static তালিকা মিলিয়ে একটির IP বদলান।',
    'Two devices use the same IPv4 address, causing drops for one or both.',
    ['“There is an IP address conflict with another system on the network”', 'Connection works then drops intermittently', 'Two devices flip-flop in ARP table'],
    ['Static IP set inside the DHCP pool', 'Duplicate static assignments', 'Rogue DHCP server or router', 'Device with stale lease'],
    [['Note the PC’s IP and MAC.', 'ipconfig /all', 'Record IPv4 address and Physical Address.'],
     ['See who answers for the IP from this PC.', 'arp -a', 'Compare the MAC listed for your IP with your own MAC. A different MAC = another device uses it.'],
     ['Check your IP list/tracker and the DHCP lease table on the router/server for that address.'],
     ['Disconnect the suspected duplicate device and ping the IP.', 'ping <conflicting-ip>', 'No reply after disconnecting means that device was the duplicate.']],
    ['Give the static device an address outside the DHCP scope, or create a DHCP reservation.', 'On the PC that should use DHCP: set “Obtain an IP address automatically”, then renew the lease.', 'Record the final assignment in the tracker/inventory.'],
    ['Unknown device owns the address (possible rogue device).', 'Conflicts repeat after fixes (rogue DHCP server).'],
    ['ipconfig /release drops the PC’s network connection; avoid it over a remote session.']);

  G('network', 'dhcp-failure', 'Cannot Obtain DHCP Address',
    'PC ১৬৯.২৫৪.x.x (APIPA) IP পেলে DHCP সার্ভার থেকে IP পাচ্ছে না। ক্যাবল/Wi-Fi, DHCP সার্ভার ও scope পূর্ণ কিনা দেখুন, তারপর ipconfig /renew চেষ্টা করুন।',
    'The device gets no valid address from DHCP and ends up with 169.254.x.x or 0.0.0.0.',
    ['IPv4 address 169.254.x.x (APIPA)', '“Limited or no connectivity”', 'Other devices get addresses normally'],
    ['No link/cable/port/VLAN fault', 'DHCP server stopped or scope exhausted', 'DHCP relay/helper misconfigured', 'MAC filtering on router/AP', 'Network adapter driver issue'],
    [['Confirm link: lights, cable, try another port or cable.'],
     ['Check the current address.', 'ipconfig /all', 'Look for “DHCP Enabled: Yes” and the DHCP Server line. 169.254.x.x = no lease.'],
     ['Try to renew (CMD as administrator).', 'ipconfig /renew', 'A valid IP from your LAN range.'],
     ['Test whether another device gets an address on the same port/cable (isolates PC vs network).'],
     ['On the DHCP server/router, check the scope has free addresses and the service is running (ask the network/server admin if this is not your area).']],
    ['Free scope space (shorten lease, remove stale leases) or enlarge the scope.', 'Restart the DHCP service/router with approval.', 'Reinstall/update the NIC driver.'],
    ['Many devices fail to get leases (server/relay/VLAN issue).', 'MAC filtering or NAC policies are involved.'],
    ['ipconfig /release then /renew interrupts connectivity and breaks remote sessions.', 'Do not set a random static IP — it may conflict.']);

  G('network', 'gateway-unreachable', 'Default Gateway Unreachable',
    'Gateway ping না গেলে PC ও router/switch-এর মধ্যে সমস্যা। Gateway IP ঠিক আছে কিনা, ক্যাবল/পোর্ট ও VLAN দেখুন।',
    'The PC cannot reach its router/gateway, so nothing outside the local subnet works.',
    ['Request timed out / Destination host unreachable when pinging the gateway', 'Local devices reachable but internet not', 'Gateway field empty or wrong'],
    ['Wrong static gateway or subnet mask', 'Wrong VLAN/port configuration', 'Router/L3 switch down', 'Cable or port fault', 'Gateway blocks ICMP (ping fails but traffic works)'],
    [['Find the gateway.', 'ipconfig', 'Default Gateway is normally the first or last address of your subnet.'],
     ['Ping it.', PING_GW, 'Replies. Some firewalls block ping — also test by opening the router’s web page.'],
     ['Check the ARP table for the gateway’s MAC.', 'arp -a', 'The gateway IP has a dynamic MAC entry.'],
     ['Verify IP and mask are in the same subnet as the gateway (use the Subnet Calculator).'],
     ['Check the routing table.', 'route print', 'A 0.0.0.0 default route pointing to the correct gateway.'],
     ['Try another port/cable or another PC on the same port to isolate the fault.']],
    ['Correct static settings or switch to DHCP.', 'Move the device to the right VLAN/port.', 'Replace faulty cable/patch cord.'],
    ['Gateway is down for everyone.', 'VLAN or trunk configuration is required.'],
    ['Changing routes manually (route add/delete) can cut off connectivity — avoid unless guided.']);

  G('network', 'slow-network', 'Slow Internet or Network',
    'ইন্টারনেট ধীর হলে আগে একাধিক ডিভাইসে টেস্ট করুন। ping ও tracert দিয়ে latency দেখুন, bandwidth ব্যবহারকারী অ্যাপ/ডিভাইস খুঁজুন।',
    'Pages and transfers are slower than normal.',
    ['Pages load slowly or time out', 'Downloads far below plan speed', 'Video calls freeze'],
    ['Bandwidth saturated by downloads/updates/backups', 'Weak Wi-Fi signal or interference', 'Faulty cable/duplex mismatch', 'ISP congestion', 'Malware or background sync', 'Slow DNS'],
    [['Test on a wired PC and on a phone to see whether it is Wi-Fi, the PC, or the whole network.'],
     ['Check latency to the gateway and the internet.', 'ping -n 20 8.8.8.8', 'Consistent low times; avg well under 100 ms domestically, no loss.'],
     ['Look at the hop-by-hop path.', 'tracert 8.8.8.8', 'No hop with a sudden large jump or repeated timeouts all the way after it.'],
     ['Open Task Manager → Performance → Ethernet/Wi-Fi to see local usage; check the router’s client/bandwidth page for heavy users.'],
     ['Check link speed on the adapter (Network Connections → Status). 100 Mbps on a gigabit port suggests a bad cable.'],
     ['Time DNS lookups.', 'nslookup google.com', 'Answer returns instantly.']],
    ['Pause large downloads/updates/backups during work hours.', 'Replace bad cables; move Wi-Fi clients closer or to 5 GHz.', 'Apply QoS or limits on the router (with approval).'],
    ['Slow only at certain hours for everyone (ISP congestion/plan limit).', 'Packet loss beyond your router.'],
    ['Do not run “speed test” tools on production links during critical hours without telling others.']);

  G('network', 'wifi-problems', 'Wi-Fi Connection Problems',
    'Wi-Fi না জুড়লে বা বারবার ডিসকানেক্ট হলে signal, পাসওয়ার্ড, ব্যান্ড (2.4/5 GHz) ও AP-এর লোড দেখুন। প্রয়োজনে Wi-Fi report তৈরি করুন।',
    'Cannot connect to Wi-Fi, keeps dropping, or has weak speed.',
    ['Network not listed', '“Can’t connect to this network”', 'Frequent disconnects', 'Low signal bars'],
    ['Wrong password / changed security', 'Weak signal or interference', 'AP overloaded or MAC filter', 'Driver or power-saving setting', 'Airplane mode or Wi-Fi switch off'],
    [['Check Airplane mode and the laptop Wi-Fi key/switch.'],
     ['List saved profiles and the current connection.', 'netsh wlan show interfaces', 'State: connected, with Signal %. Below ~50% is weak.'],
     ['Forget the network and reconnect with the correct password.'],
     ['Compare with a phone at the same spot to see if the AP or the laptop is the issue.'],
     ['Generate the Wi-Fi report (administrator CMD).', 'netsh wlan show wlanreport', 'HTML report with disconnect reasons; the file path is printed.'],
     ['Update the Wi-Fi adapter driver; in Device Manager → adapter → Power Management untick “Allow the computer to turn off this device”.']],
    ['Move closer / reposition AP; use 5 GHz where supported.', 'Change a congested channel on the AP.', 'Update or reinstall the driver.'],
    ['Many users drop at once (AP/controller/uplink fault).', 'Rogue AP or interference suspected.'],
    ['Changing AP settings affects all clients — schedule it.']);

  G('network', 'lan-cable-port', 'LAN Cable or Network Port Problems',
    'লিংক লাইট না জ্বললে ক্যাবল বা পোর্ট নষ্ট হতে পারে। অন্য ক্যাবল/পোর্ট/পিসি দিয়ে টেস্ট করে সমস্যা আলাদা করুন।',
    'No link or an unstable wired connection.',
    ['“Network cable unplugged”', 'Link light off or flickering', 'Speed negotiates at 10/100 Mbps instead of 1 Gbps'],
    ['Damaged cable or connector', 'Patch panel / wall jack fault', 'Switch port disabled, errored or in wrong VLAN', 'NIC fault', 'Cable too long or poorly terminated'],
    [['Reseat both ends; look for bent clips or damaged pins.'],
     ['Swap the patch cord with a known-good one.'],
     ['Move the cable to a different switch port (or a different wall port).'],
     ['Try a known-good laptop on the same cable/port.'],
     ['Check adapter status.', 'ipconfig', 'No “Media disconnected” when linked.'],
     ['Check the switch port status/speed/errors on the switch UI (if you have access).']],
    ['Replace cable, re-punch the jack, or use a spare port.', 'Re-enable a disabled switch port (authorised staff).', 'Replace a faulty NIC.'],
    ['Structured cabling fault (in-wall run) needs the cabling contractor.', 'Switch port errors rise or port keeps flapping.'],
    ['Do not hot-plug into an unknown switch port that may be part of a loop — you could cause a network storm.']);

  G('network', 'vpn-problems', 'VPN Connection Problems',
    'VPN না জুড়লে আগে সাধারণ ইন্টারনেট ঠিক আছে কিনা দেখুন, তারপর ইউজারনেম/পাসওয়ার্ড/সার্টিফিকেট, সময় (time sync) ও firewall পোর্ট চেক করুন।',
    'The VPN will not connect, disconnects, or connects but internal resources are unreachable.',
    ['Authentication failed', 'Timeout / “remote connection was not made”', 'Connected but internal sites fail', 'Slow over VPN'],
    ['No base internet connection', 'Wrong credentials, expired password or MFA issue', 'Blocked VPN ports (e.g. UDP 500/4500, TCP 443)', 'Wrong date/time (certificate errors)', 'Client outdated or profile misconfigured', 'Split-DNS / routing issues'],
    [['Confirm normal internet works without VPN.', 'ping 8.8.8.8', 'Replies.'],
     ['Check date/time/time zone are correct (certificates depend on it).'],
     ['Re-enter credentials; confirm the account is not locked/expired and MFA works.'],
     ['After connecting, check you got a VPN IP.', 'ipconfig /all', 'A VPN adapter with an address from the VPN pool.'],
     ['Test internal name and IP.', 'nslookup <internal-server>', 'Resolves via the VPN DNS. If IP works but name fails, DNS settings are the problem.'],
     ['Try another network (mobile hotspot) to see if the current network blocks VPN.']],
    ['Update the VPN client / re-import the profile.', 'Unblock required ports at the firewall (network team).', 'Reset the account password/MFA via the administrator.'],
    ['Server-side errors or certificates (VPN/firewall admin).', 'Many users fail simultaneously.'],
    ['Never share VPN credentials or configuration files over chat/email.']);

  G('network', 'shared-folder', 'Cannot Access Shared Folder',
    'শেয়ার ফোল্ডার না খুললে সার্ভার/পিসি ping করুন, \\\\server\\share path ঠিক কিনা, পারমিশন ও SMB চালু আছে কিনা এবং পুরোনো credentials আছে কিনা দেখুন।',
    'A \\\\server\\share path fails to open.',
    ['“Windows cannot access \\\\server\\share”', 'Error 0x80070035 (network path not found)', 'Access is denied (error 5)', 'Credentials keep being rejected'],
    ['Host offline or name not resolving', 'Firewall blocking SMB (TCP 445)', 'Missing share/NTFS permissions', 'Cached wrong credentials', 'Different workgroup/domain, or SMB version disabled'],
    [['Ping the host.', 'ping <server-name>', 'Replies. Then try the IP instead of the name.'],
     ['Test the SMB port (PowerShell).', 'Test-NetConnection <server> -Port 445', 'TcpTestSucceeded : True'],
     ['List shares on the host.', 'net view \\\\<server>', 'The share name appears in the list.'],
     ['Check current mapped connections and clear stale ones.', 'net use', 'Remove a stale mapping with: net use \\\\<server>\\<share> /delete'],
     ['Open Credential Manager (Control Panel) and delete old entries for the server, then retry with the correct account.'],
     ['Ask the server admin to verify both share permissions and NTFS permissions for your account/group.']],
    ['Use the server IP if the name does not resolve.', 'Fix permissions or group membership (authorised admin).', 'Allow “File and Printer Sharing” in the firewall profile.'],
    ['Permissions or server fault (file-server admin).', 'Many users cannot reach the server.'],
    ['Do not enable SMB1 as a quick fix — it is insecure.', 'Do not share folders with “Everyone: Full control”.']);

  G('network', 'network-printer', 'Cannot Access Network Printer',
    'নেটওয়ার্ক প্রিন্টার না পেলে প্রিন্টারের IP ping করুন, port 9100 টেস্ট করুন এবং Printer port/IP ঠিক আছে কিনা দেখুন। প্রিন্টার বন্ধ বা IP বদলেছে কিনা চেক করুন।',
    'A shared or TCP/IP network printer cannot be reached or does not print.',
    ['Printer shows Offline', 'Cannot connect to printer (error 0x0000011b / 0x00000709)', 'Jobs queue but nothing prints'],
    ['Printer powered off or lost network', 'Printer IP changed (DHCP)', 'Wrong port in printer properties', 'Print server/spooler issues', 'Windows policy changes for shared printers'],
    [['Print a configuration page from the printer panel to read its current IP.'],
     ['Ping the printer.', 'ping <printer-ip>', 'Replies.'],
     ['Test the raw print port.', 'Test-NetConnection <printer-ip> -Port 9100', 'TcpTestSucceeded : True'],
     ['In Printer properties → Ports, confirm the Standard TCP/IP port points to the current IP.'],
     ['Check the print queue and the spooler.', 'Get-Service Spooler', 'Status: Running'],
     ['For shared printers, ping and open the print server (\\\\server) first.']],
    ['Reserve a DHCP address or set a static IP outside the DHCP range for the printer.', 'Update the printer port IP.', 'Restart the spooler (see the Print Queue guide).'],
    ['Printer or print server hardware fault; vendor support.', 'Errors 0x0000011b / 0x00000709 after Windows updates (needs policy/registry guidance from senior staff).'],
    ['Registry/policy changes for printing weaken security — ask a senior engineer.']);

  G('network', 'intermittent', 'Intermittent Connectivity',
    'নেটওয়ার্ক মাঝে মাঝে গেলে লম্বা সময় ping -t চালিয়ে দেখুন কখন ড্রপ হয়। ক্যাবল, Wi-Fi সিগন্যাল, IP conflict ও পাওয়ার সেটিং চেক করুন।',
    'The connection works, then drops for seconds or minutes without a clear pattern.',
    ['Random disconnects', 'Calls/RDP freeze then recover', 'Works at some times of day'],
    ['Bad cable/port or loose connector', 'Wi-Fi interference/roaming', 'IP or MAC conflict', 'NIC power saving', 'Overloaded switch/router or faulty PSU', 'ISP link flapping'],
    [['Start a continuous ping to the gateway in one window and to 8.8.8.8 in another; note when failures occur.', 'ping -t <gateway-ip>', 'Replies continue. Press Ctrl+C to stop and read the statistics.'],
     ['If only the gateway ping fails, the problem is local (cable/Wi-Fi/switch). If only 8.8.8.8 fails, it is beyond your router.'],
     ['Check for IP conflicts (see guide) and event log: Event Viewer → Windows Logs → System, filter for network/DHCP/Tcpip.'],
     ['Disable adapter power saving: Device Manager → adapter → Power Management → untick “Allow the computer to turn off this device”.'],
     ['Swap the cable/port, or move closer to the AP, and compare.']],
    ['Replace faulty cable or port; update drivers.', 'Reserve addresses for important devices.', 'Reduce interference or reposition APs.'],
    ['Router/switch logs show link flaps or errors.', 'Pattern correlates with ISP outages.'],
    ['Leave long ping tests running only on machines you are authorised to use.']);

  G('network', 'packet-loss', 'Packet Loss and High Latency',
    'Packet loss বা বেশি ping time থাকলে pathping ও tracert দিয়ে কোন hop-এ সমস্যা তা খুঁজুন। লোকাল হলে ক্যাবল/Wi-Fi, না হলে ISP।',
    'Pings show lost packets or very high round-trip times.',
    ['“Request timed out” in some replies', 'Lag in calls/games/RDP', 'Ping times jump (e.g. 20 ms → 800 ms)'],
    ['Congested link or saturated uplink', 'Wi-Fi interference', 'Faulty cable/duplex mismatch', 'ISP routing/peering issue', 'Overloaded device (CPU) at a hop'],
    [['Run a longer ping to the gateway and to the internet.', 'ping -n 50 <gateway-ip>', '0% loss locally. Any loss on the gateway ping = local problem.'],
     ['Repeat to a public IP.', 'ping -n 50 8.8.8.8', '0% loss; times stable.'],
     ['Trace the path.', 'tracert 8.8.8.8', 'Find the first hop where latency jumps and stays high.'],
     ['Measure per-hop loss (takes ~5 minutes).', 'pathping 8.8.8.8', 'Loss that begins at a hop and continues on later hops is real; loss only at one hop can be rate-limiting.'],
     ['Check for local saturation (Task Manager → Performance → network) and for Wi-Fi vs wired differences.']],
    ['Fix local causes (cable, Wi-Fi channel, heavy users).', 'Provide traceroute/pathping output to the ISP when the fault is beyond your router.'],
    ['Loss/latency starts at or after the ISP’s first hop.', 'Problem is at the router or switch you do not manage.'],
    ['ICMP can be de-prioritised by routers; confirm with a second test (e.g. a file transfer) before blaming the ISP.']);

  /* ================= HARDWARE & WINDOWS (Module E) ================= */
  G('hardware', 'no-power', 'Computer Not Powering On',
    'পিসি চালু না হলে পাওয়ার ক্যাবল/সকেট/UPS, PSU সুইচ ও পাওয়ার বাটন দেখুন। ল্যাপটপে ব্যাটারি/চার্জার পরীক্ষা করুন; ভেতরের কাজ শুধু অনুমোদিত হলে করুন।',
    'No lights, fans or beeps when pressing the power button.',
    ['Completely dead', 'Fans spin briefly then stop', 'Power light on but no boot'],
    ['No power at the outlet/UPS or bad cable', 'PSU failure or switch off', 'Laptop charger/battery fault', 'Front-panel button or motherboard fault', 'Short or loose internal component'],
    [['Check the wall outlet/UPS with another device; reseat the power cable; check the PSU rear switch is ON.'],
     ['Try a different known-good power cable / outlet. For laptops, test another charger of the same rating.'],
     ['Unplug everything (USB, printers, extra displays) and try again.'],
     ['Laptop: remove power and battery (if removable), hold the power button 30 s, reconnect and try.'],
     ['Desktop: look for motherboard standby LED and listen for beeps (beep codes differ by vendor).'],
     ['Only if authorised: reseat RAM and check power connectors inside the case after unplugging power.']],
    ['Replace cable/charger/PSU as diagnosed.', 'Replace UPS battery if the UPS fails to supply power.'],
    ['Suspected motherboard/PSU failure, burning smell, swollen battery.', 'Device under warranty — raise a vendor claim instead of opening it.'],
    ['Unplug before opening any case; discharge static (touch metal).', 'A swollen laptop battery is a fire hazard — stop using it.']);

  G('hardware', 'no-display', 'No Display',
    'পাওয়ার আছে কিন্তু স্ক্রিন কালো হলে মনিটর/কেবল/ইনপুট সোর্স পরীক্ষা করুন, অন্য মনিটর দিয়ে টেস্ট করুন এবং ডেস্কটপে গ্রাফিক্স কার্ড বা ইন-বিল্ট পোর্ট ঠিক আছে কিনা দেখুন।',
    'The computer seems on but the screen is black or says “No signal”.',
    ['Monitor says “No signal”', 'Fans run but black screen', 'Display works only in BIOS or only in Safe Mode'],
    ['Wrong input source or loose cable', 'Faulty monitor or cable', 'Plugged into motherboard instead of the graphics card (or reverse)', 'RAM or GPU problem', 'Display driver issue'],
    [['Check the monitor power and input source (HDMI/DP/VGA) and reseat the cable at both ends.'],
     ['Test the monitor with another PC or the PC with another monitor/cable.'],
     ['Desktop: connect to the graphics-card port if one is installed (not the motherboard port).'],
     ['Press Win+Ctrl+Shift+B to restart the graphics driver, and Win+P to cycle projection modes.'],
     ['If you hear beeps or see keyboard lights not responding, reseat RAM (authorised, power unplugged).'],
     ['Boot to Safe Mode (hold Shift while choosing Restart) and uninstall/roll back the display driver if the issue started after a driver update.']],
    ['Replace cable/monitor.', 'Update or roll back the display driver.', 'Reseat/replace RAM or GPU.'],
    ['No image on any display and no POST — likely board/GPU failure.'],
    ['Never plug or unplug internal parts with power connected.']);

  G('hardware', 'slow-computer', 'Slow Computer',
    'কম্পিউটার ধীর হলে Task Manager-এ CPU/RAM/Disk দেখুন, স্টার্টআপ প্রোগ্রাম কমান, ডিস্কের স্পেস ও Windows আপডেট চেক করুন।',
    'The PC is slow to start, open apps, or respond.',
    ['Long boot time', 'Apps freeze', 'Disk or CPU at 100% in Task Manager'],
    ['Too many startup programs', 'Low RAM or full/slow disk (HDD)', 'Malware or background updates', 'Overheating / throttling', 'Outdated drivers'],
    [['Open Task Manager (Ctrl+Shift+Esc) → Processes; sort by CPU, Memory and Disk to find the heavy item.'],
     ['Check Startup apps tab and disable unneeded entries.'],
     ['Check free disk space (File Explorer → This PC). Keep at least 10–15% free.'],
     ['Check disk health.', 'Get-PhysicalDisk | Select FriendlyName,HealthStatus,OperationalStatus', 'HealthStatus: Healthy'],
     ['Check Windows Update is not running in the background; restart after pending updates.'],
     ['Run a malware scan with the approved antivirus.'],
     ['If still slow, run system file checks (administrator CMD).', 'sfc /scannow', 'Completes with “did not find any integrity violations” or repairs files.']],
    ['Disable startup bloat, uninstall unused programs, clean temp files (Disk Cleanup).', 'Add RAM or replace an HDD with an SSD.', 'Reinstall Windows as a last resort after backing up data.'],
    ['Disk shows SMART/health warnings (back up now).', 'Suspected malware infection.'],
    ['Back up important data before any repair that modifies the system.']);

  G('hardware', 'high-cpu', 'High CPU Usage',
    'CPU ১০০% হলে Task Manager-এ কোন প্রসেস বেশি ব্যবহার করছে তা দেখুন। Windows Update, অ্যান্টিভাইরাস স্ক্যান বা ম্যালওয়্যার হতে পারে।',
    'CPU stays near 100% and the PC lags.',
    ['Fan noise / heat', 'Specific process uses most CPU', 'System unresponsive'],
    ['Windows Update/Defender scanning', 'Runaway or malicious process', 'Browser tabs/extensions', 'Overheating throttling', 'Driver bug'],
    [['Task Manager → Processes → click CPU to sort; note the top process.'],
     ['List processes from CMD.', 'tasklist', 'Identify unfamiliar names and note PIDs.'],
     ['Wait 10–15 minutes if it is Windows Update or antivirus scanning; it often settles.'],
     ['Close/disable heavy browser tabs and extensions.'],
     ['Check temperatures (BIOS/vendor tool) and clean dust if overheating (see Overheating).'],
     ['Scan for malware with approved tools.']],
    ['Update or remove the problem application/driver.', 'End a hung task only after saving work.'],
    ['Unknown process with high CPU that returns after removal.', 'System service itself is stuck repeatedly.'],
    ['Ending system processes can crash Windows; only end processes you recognise.']);

  G('hardware', 'high-ram', 'High RAM Usage',
    'RAM বেশি ব্যবহার হলে Task Manager-এ Memory কলাম দেখুন। বেশি অ্যাপ/ব্রাউজার ট্যাব বন্ধ করুন, প্রয়োজনে RAM বাড়ান।',
    'Memory use is above ~85–90% and the system swaps to disk.',
    ['“Your computer is low on memory”', 'Apps close or freeze', 'Heavy disk activity'],
    ['Too many apps/tabs', 'Memory leak in an app or driver', 'Insufficient installed RAM', 'Virtual machines or large files open'],
    [['Task Manager → Performance → Memory: note total, in use, committed.'],
     ['Processes tab → sort by Memory; close or restart the biggest non-essential app.'],
     ['Check installed RAM.', 'Get-CimInstance Win32_PhysicalMemory | Select Capacity,Speed', 'Capacity per module (bytes).'],
     ['Restart the PC to clear leaked memory; recheck after opening your usual apps.'],
     ['Optionally run Windows Memory Diagnostic if crashes also occur.', 'mdsched.exe', 'Restart prompt; results appear after reboot in Event Viewer.']],
    ['Close unused apps/tabs, update the leaking application.', 'Upgrade RAM (check supported type and slots).'],
    ['Memory errors found in diagnostics (replace the module).'],
    ['mdsched.exe restarts the PC — save your work first.']);

  G('hardware', 'high-disk', 'High Disk Usage',
    'ডিস্ক ১০০% দেখালে (বিশেষ করে HDD) Task Manager-এ কোন প্রসেস চালাচ্ছে দেখুন। আপডেট/সার্চ ইনডেক্সিং/অ্যান্টিভাইরাস হতে পারে; ডিস্ক হেলথও পরীক্ষা করুন।',
    'Disk activity stays at or near 100%, making everything slow.',
    ['Task Manager shows Disk 100%', 'Long freezes while opening files', 'Clicking noise from an HDD'],
    ['Aging HDD or failing disk', 'Windows Update/search indexing/antivirus', 'Low free space', 'Heavy paging from low RAM', 'Faulty storage driver'],
    [['Task Manager → Processes → sort by Disk to see the cause.'],
     ['Check disk health.', 'Get-PhysicalDisk | Select FriendlyName,MediaType,HealthStatus', 'HealthStatus: Healthy'],
     ['Check the file system for errors (read-only check).', 'chkdsk C:', 'Windows scanned the file system and found no problems.'],
     ['Make sure at least 10–15% of the drive is free.'],
     ['Let updates/indexing finish, then re-check; add RAM if paging is heavy.']],
    ['Remove or move large files; disable unneeded startup items.', 'Replace the HDD with an SSD (back up and clone first).'],
    ['Health shows Warning/Unhealthy or you hear clicking — back up immediately and escalate.'],
    ['Avoid chkdsk /f or /r on a failing disk before taking a backup.']);

  G('hardware', 'boot-failure', 'Windows Boot Failure',
    'Windows না চালু হলে আগে ডেটা ব্যাকআপের কথা ভাবুন। Startup Repair, Safe Mode ও recovery environment ব্যবহার করুন; ডিস্ক হেলথ নিশ্চিত করুন।',
    'Windows does not reach the desktop.',
    ['“Operating system not found”, “Boot device not available”', 'Boot loop or Automatic Repair loop', 'Stuck on logo'],
    ['Boot order or BIOS settings changed', 'Corrupt boot files/system files', 'Failing disk', 'Faulty update or driver', 'Disconnected drive/cable'],
    [['Remove USB drives/discs; enter BIOS/UEFI and confirm the system disk is detected and first in boot order.'],
     ['If the disk is not detected in BIOS, check cables (desktop) and suspect disk failure.'],
     ['Boot into Windows Recovery (Automatic Repair, or Shift+Restart, or install media → Repair your computer).'],
     ['Try Startup Repair, then Safe Mode, then System Restore (if a restore point exists).'],
     ['From recovery Command Prompt, check disk and system files (drive letters may differ).', 'sfc /scannow /offbootdir=C:\\ /offwindir=C:\\Windows', 'Repairs files or reports none found.'],
     ['If data matters, copy it out first (Command Prompt/Notepad Open dialog or a USB-to-SATA adapter).']],
    ['Repair boot files (senior staff), uninstall the latest update, or restore from backup.', 'Reinstall Windows only after saving data.'],
    ['Disk not detected or clicking — possible data recovery job.', 'BitLocker recovery key prompts (get the key from the authorised admin).'],
    ['Do not format or reset if the data is not backed up.', 'bootrec/diskpart commands can destroy data if wrong — escalate if unsure.']);

  G('hardware', 'bsod', 'Blue Screen (BSOD) Errors',
    'ব্লু স্ক্রিনে লেখা stop code টুকু লিখে রাখুন (যেমন MEMORY_MANAGEMENT)। সাম্প্রতিক ড্রাইভার/আপডেট, RAM ও ডিস্ক পরীক্ষা করুন।',
    'Windows crashes with a blue screen and restarts.',
    ['Stop code (e.g. IRQL_NOT_LESS_OR_EQUAL, CRITICAL_PROCESS_DIED)', 'Random restarts', 'Crash after installing hardware/driver'],
    ['Faulty or incompatible driver', 'Bad RAM or failing disk', 'Overheating', 'Corrupt system files', 'Recent update or software conflict'],
    [['Write down the stop code and the failing file name shown on the screen (or photograph it). See “Windows error reference” in this site.'],
     ['Think what changed: new driver, update, device or software.'],
     ['Check recent errors: Event Viewer → Windows Logs → System, filter by Critical/Error around the crash time.'],
     ['Run system file checks.', 'sfc /scannow', 'No integrity violations, or repairs completed.'],
     ['Repair the component store if sfc cannot fix files.', 'DISM /Online /Cleanup-Image /RestoreHealth', 'The restore operation completed successfully.'],
     ['Test RAM (mdsched.exe) and disk health.', 'mdsched.exe', 'No errors detected after reboot.']],
    ['Roll back/update the suspect driver; uninstall the last update/app.', 'Replace faulty RAM/disk.', 'Remove overclock/BIOS tweaks.'],
    ['Repeated crashes with different stop codes (hardware).', 'Memory dump analysis needed (senior engineer).'],
    ['Back up data first if the disk may be failing.']);

  G('hardware', 'drivers', 'Driver Problems',
    'ডিভাইস কাজ না করলে Device Manager-এ হলুদ চিহ্ন দেখুন। ড্রাইভার আপডেট/রোলব্যাক করুন; নির্মাতার সাইট থেকে সঠিক ড্রাইভার নিন।',
    'A device does not work or shows an error in Device Manager.',
    ['Yellow warning icon', '“Code 10/28/43” errors', 'Device disappears after update'],
    ['Missing or wrong driver', 'Faulty update', 'Windows blocked an unsigned driver', 'Hardware fault'],
    [['Open Device Manager (devmgmt.msc) → find devices with warning icons; open Properties for the error code.', 'devmgmt.msc'],
     ['Note the exact model; download the driver from the manufacturer (not random driver sites).'],
     ['Try Update driver → Search automatically, or install the downloaded package.'],
     ['If it broke after an update: Properties → Driver → Roll Back Driver.'],
     ['List signed driver info if needed.', 'Get-CimInstance Win32_PnPSignedDriver | Select DeviceName,DriverVersion | Select -First 20', 'Driver names and versions.']],
    ['Reinstall/rollback the driver; install chipset/BIOS updates from the vendor.', 'Test the device on another PC to rule out hardware fault.'],
    ['Device fails on every PC (hardware).', 'Enterprise driver deployment needed.'],
    ['Avoid “driver updater” utilities — they often install wrong or unsafe drivers.']);

  G('hardware', 'windows-update', 'Windows Update Errors',
    'Windows Update ব্যর্থ হলে ডিস্ক স্পেস, ইন্টারনেট ও সময় ঠিক আছে কিনা দেখুন। Update troubleshooter, sfc ও DISM চালান।',
    'Updates fail, stall or roll back.',
    ['Error codes like 0x80070002, 0x800f0922, 0x80073712', 'Stuck at a percentage', 'Updates fail repeatedly'],
    ['Low disk space', 'Corrupt update cache or system files', 'Connectivity/proxy problems', 'Security software conflict', 'Service stopped'],
    [['Check free space (at least 10–20 GB for feature updates) and connectivity.'],
     ['Run Settings → Update & Security → Troubleshoot → Windows Update.'],
     ['Check the update service.', 'Get-Service wuauserv', 'Running (or Stopped but startable).'],
     ['Repair system files.', 'DISM /Online /Cleanup-Image /RestoreHealth', 'Completes successfully.'],
     ['Then verify files.', 'sfc /scannow', 'No integrity violations.'],
     ['Retry the update after restart; for a single failing update, install it manually from the Microsoft Update Catalog.'],
     ['List installed updates for support notes.', 'Get-HotFix', 'KB list with install dates.']],
    ['Clear space, restart, retry; temporarily pause third-party security software if allowed.', 'Use in-place upgrade repair install (senior staff).'],
    ['Same error persists after repairs.', 'Domain WSUS/Intune policy involvement.'],
    ['Do not delete the SoftwareDistribution folder without guidance; stop services first and keep a copy.']);

  G('hardware', 'install-failure', 'Software Installation Failures',
    'সফটওয়্যার ইনস্টল না হলে Administrator অধিকার, পুরোনো ভার্সন, ডিস্ক স্পেস ও এন্টিভাইরাস ব্লকিং এবং সঠিক 32/64-bit ভার্সন পরীক্ষা করুন।',
    'An installer fails, rolls back, or the app will not start afterwards.',
    ['“Error 1603”, “0x80070643”', 'Installer closes silently', '“This app can’t run on your PC”'],
    ['Not run as administrator / policy blocks', 'Missing prerequisites (.NET, VC++)', 'Previous version remnants', 'Antivirus blocking', 'Wrong architecture or corrupt installer', 'Low disk space'],
    [['Confirm the installer source is trusted and the file fully downloaded (re-download if size looks wrong).'],
     ['Right-click → Run as administrator; confirm free disk space.'],
     ['Check OS version/architecture.', 'systeminfo | findstr /B /C:"OS Name" /C:"System Type"', 'OS Name and x64/x86 type to match the installer.'],
     ['Uninstall earlier versions from Apps & features and restart.'],
     ['Check Event Viewer → Application log (MsiInstaller) for the exact error.'],
     ['Check company policy/AppLocker/antivirus logs if the installer is blocked.']],
    ['Install prerequisites, then retry.', 'Use the vendor’s cleanup tool for the old version.'],
    ['Software requires licensing/deployment tools (SCCM/Intune).', 'Blocked by security policy — request an exception via the proper channel.'],
    ['Do not disable security software for long or install cracked software.']);

  G('hardware', 'battery-health', 'Laptop Battery Health',
    'ব্যাটারির স্বাস্থ্য জানতে powercfg /batteryreport চালান। Design capacity ও Full charge capacity তুলনা করুন — নিচের ক্যালকুলেটর দিয়ে শতকরা হিসাব করা যায়।',
    'Battery drains fast, will not charge, or shuts down suddenly.',
    ['Runtime much shorter than new', '“Consider replacing your battery”', 'Stuck at a percentage'],
    ['Normal wear (cycle count)', 'Heat damage', 'Faulty charger or port', 'Power-hungry apps', 'Calibration issue'],
    [['Generate the battery report (CMD).', 'powercfg /batteryreport', 'Creates battery-report.html; the path is printed.'],
     ['Open the HTML report; read “Design capacity” and “Full charge capacity” (mWh). The calculator below computes health % for you.'],
     ['Check Cycle count and the “Recent usage” table for sudden drops.'],
     ['Test with another compatible charger and check for physical damage to the DC port.'],
     ['Optionally run a deeper power analysis (administrator CMD, takes 60 s, do not use the PC).', 'powercfg /energy', 'Creates energy-report.html listing problems.']],
    ['Replace the battery when health is low (see calculator guidance).', 'Reduce heat and avoid keeping it at 100% on the charger all day if the BIOS offers a charge limit.'],
    ['Swollen battery, case deformation or overheating: stop using; escalate.'],
    ['Do not puncture or use a swollen battery.']);

  G('hardware', 'disk-health', 'SSD / HDD Health',
    'ডিস্কের স্বাস্থ্য দেখতে Get-PhysicalDisk ও chkdsk ব্যবহার করুন; HealthStatus Warning হলে এখনই ব্যাকআপ নিন।',
    'Checking whether a drive is failing or healthy.',
    ['Slow reads/writes', 'File corruption, freezes, clicking sounds', 'SMART warnings at boot'],
    ['Aging flash or mechanical wear', 'Bad sectors', 'Overheating', 'Power loss damage', 'Loose cable'],
    [['Check health in PowerShell.', 'Get-PhysicalDisk | Select FriendlyName,MediaType,HealthStatus,OperationalStatus', 'Healthy / OK.'],
     ['Check basic status in CMD.', 'wmic diskdrive get model,status', 'Status: OK (wmic is deprecated but still present on many systems).'],
     ['Read-only file-system scan.', 'chkdsk C:', 'No problems found.'],
     ['Check free space/volumes.', 'Get-Volume', 'Adequate free space.'],
     ['Use the manufacturer’s tool or a SMART viewer for detailed attributes (reallocated sectors, wear level).']],
    ['Back up, then replace any drive reporting Warning/Unhealthy.', 'Move to SSD for HDD slowness.'],
    ['Health is not Healthy or SMART reports failure — back up first and escalate.'],
    ['chkdsk /f and /r write to the disk and can take hours; do not run them on a drive that may be failing before a backup.']);

  G('hardware', 'overheating', 'Overheating',
    'পিসি গরম হলে ভেন্ট/ফ্যান ধুলো পরিষ্কার করুন, বাতাস চলাচল ঠিক রাখুন, ও CPU লোড কমান। বারবার বন্ধ হলে তাপমাত্রা নিয়ে সিনিয়রকে জানান।',
    'The device is very hot, fans are loud, or it shuts down.',
    ['Loud fans, hot case', 'Sudden shutdowns', 'Performance drops under load'],
    ['Dust in fans/heatsink', 'Blocked vents', 'Dried thermal paste', 'High CPU load or malware', 'Failed fan', 'High room temperature'],
    [['Check for blocked vents (e.g. laptop on soft surface) and room temperature.'],
     ['Task Manager: check for runaway CPU/GPU usage (see High CPU guide).'],
     ['Check temperatures in BIOS/UEFI or with vendor tools.'],
     ['With permission and power off: clean dust with compressed air in short bursts, holding the fan still.'],
     ['Check that all fans spin at power-on.']],
    ['Improve airflow, use a cooling pad, replace fans, renew thermal paste (authorised technician).'],
    ['Repeated thermal shutdowns after cleaning.', 'Under warranty — do not open; claim service.'],
    ['Do not spin fans with compressed air without holding them; do not use a vacuum on electronics.']);

  G('hardware', 'audio-mic', 'Audio and Microphone Problems',
    'সাউন্ড/মাইক না চললে আউটপুট/ইনপুট ডিভাইস, ভলিউম/মিউট, প্রাইভেসি পারমিশন ও ড্রাইভার চেক করুন।',
    'No sound, no microphone input, or crackling.',
    ['No sound from speakers/headset', 'Mic not detected in meetings', 'Muted or wrong device selected'],
    ['Wrong output/input device', 'Muted or volume at 0', 'Microphone privacy setting off', 'Driver problem', 'Faulty cable/jack'],
    [['Check physical mute switches, volume and plug position (front/rear jacks).'],
     ['Right-click the speaker icon → Sound settings → choose the correct Output and Input device; test with the “Test” bar.'],
     ['Settings → Privacy → Microphone: allow apps to use the microphone.'],
     ['Device Manager → Audio inputs/outputs and Sound controllers: look for warning icons; update/roll back.', 'devmgmt.msc'],
     ['Restart the audio service.', 'Restart-Service Audiosrv', 'Run PowerShell as administrator; no error output.'],
     ['Test the headset on another PC or port.']],
    ['Set the right default devices; reinstall the audio driver.', 'Replace faulty headset/cable.'],
    ['Device missing on every PC (hardware fault).'],
    []);

  G('hardware', 'usb-detect', 'USB Device Detection Problems',
    'USB ডিভাইস না চিনলে অন্য পোর্ট/পিসিতে টেস্ট করুন, Device Manager-এ দেখুন এবং পাওয়ার সেভিং বন্ধ করুন।',
    'A USB device is not recognised or keeps disconnecting.',
    ['“USB device not recognized”', 'No drive letter for a flash drive', 'Device connects/disconnects repeatedly'],
    ['Faulty port/cable/device', 'Insufficient power (unpowered hub)', 'USB selective suspend', 'Driver issue', 'Drive has no letter / needs initialising'],
    [['Try another port (back panel on desktops) and cable; avoid unpowered hubs.'],
     ['Test the device on another PC.'],
     ['Open Disk Management (diskmgmt.msc) to see if the drive appears without a letter.', 'diskmgmt.msc'],
     ['Device Manager → Universal Serial Bus controllers → Uninstall the failing device, unplug, wait 10 s and replug.'],
     ['Power Options → Advanced → USB settings → disable “USB selective suspend”.']],
    ['Assign a drive letter in Disk Management; update chipset drivers.', 'Replace the faulty cable or port.'],
    ['Device fails on all PCs.', 'Company policy blocks USB storage (do not bypass).'],
    ['Do not initialise/format a drive that holds data you need.']);

  /* ================= PRINTERS & PERIPHERALS (Module F) ================= */
  G('printer', 'printer-offline', 'Printer Offline',
    'প্রিন্টার Offline দেখালে প্রিন্টার চালু ও নেটওয়ার্কে আছে কিনা দেখুন, IP ping করুন, "Use Printer Offline" বন্ধ করে spooler রিস্টার্ট করুন।',
    'Windows shows the printer as “Offline” and jobs do not print.',
    ['Printer status: Offline', 'Print jobs stay in the queue', 'Printer works from other PCs'],
    ['Printer off, asleep or disconnected', 'IP address changed', '“Use Printer Offline” enabled', 'Spooler stuck', 'Wrong/duplicate port'],
    [['Check the printer power, display messages, paper, and cable/Wi-Fi.'],
     ['Network printer: ping its IP.', 'ping <printer-ip>', 'Replies. If not, print a config page on the printer to confirm its IP.'],
     ['Open the printer queue → Printer menu → ensure “Use Printer Offline” is unticked.'],
     ['Check the printer port in Printer properties → Ports and confirm the IP.'],
     ['List printers and status.', 'Get-Printer | Select Name,PrinterStatus,PortName', 'Normal status and the correct port.'],
     ['Restart the spooler (see Print Queue guide) and try a test page.']],
    ['Give the printer a reserved/static IP and update the port.', 'Re-add the printer if the port/driver is damaged.'],
    ['Printer hardware errors or network faults beyond the PC.'],
    []);

  G('printer', 'print-queue', 'Print Queue Stuck',
    'প্রিন্ট জব আটকে গেলে Print Spooler বন্ধ করে spool ফাইল মুছে আবার চালু করুন। এতে সব পেন্ডিং জব মুছে যাবে।',
    'A job will not print or delete and blocks everything behind it.',
    ['Job stuck on “Deleting” or “Printing”', 'No jobs print', 'Cannot cancel a document'],
    ['Corrupt job or large file', 'Driver problem', 'Spooler service hung', 'Printer error state'],
    [['Try cancelling all documents from the printer queue; check the printer has no error (paper jam, cover open).'],
     ['Check the Print Spooler service.', 'Get-Service Spooler', 'Running'],
     ['Administrator CMD: stop the spooler.', 'net stop spooler', 'The Print Spooler service was stopped successfully.'],
     ['Delete the stuck spool files (this removes ALL pending jobs).', 'del /Q /F /S "%systemroot%\\System32\\spool\\PRINTERS\\*.*"', 'Files deleted; the folder stays.'],
     ['Start the spooler again.', 'net start spooler', 'The Print Spooler service was started successfully.'],
     ['Print a test page.']],
    ['If it recurs, update/reinstall the driver or print with the “Microsoft Print to PDF” to test the app.'],
    ['Spooler keeps crashing on many PCs (print server issue).'],
    ['Deleting spool files cancels every pending print job — tell colleagues sharing the printer.']);

  G('printer', 'printer-driver', 'Printer Driver Failure',
    'ড্রাইভার সমস্যা হলে পুরোনো ড্রাইভার সরিয়ে প্রিন্টার নির্মাতার ওয়েবসাইট থেকে সঠিক মডেল ও 32/64-bit ড্রাইভার ইনস্টল করুন।',
    'Printer driver will not install, prints garbled output, or is missing.',
    ['“Driver is unavailable”', 'Garbled text or blank pages', 'Install fails with error codes'],
    ['Wrong model/architecture driver', 'Corrupt old driver', 'Windows update replaced the driver', 'Insufficient rights'],
    [['Identify the exact printer model and Windows version/architecture.'],
     ['Remove the printer from Settings → Printers & scanners.'],
     ['Open Print Server properties → Drivers and remove the old driver package.', 'printui.exe /s /t2', 'The Drivers tab lists installed drivers.'],
     ['Download the driver from the manufacturer and install as administrator.'],
     ['Add the printer again and print a test page.']],
    ['Use the manufacturer’s universal driver (PCL/PS) if the model-specific one fails.', 'Pin a known-good driver version for the office.'],
    ['Needs print-server/driver deployment (Group Policy).'],
    ['Back up the printer settings/defaults before removing drivers on shared print servers.']);

  G('printer', 'printer-setup', 'Network Printer Setup',
    'নেটওয়ার্ক প্রিন্টার যোগ করতে প্রথমে প্রিন্টারকে স্ট্যাটিক/রিজার্ভ IP দিন, তারপর Standard TCP/IP port (৯১০০) ও সঠিক ড্রাইভার দিয়ে যোগ করুন।',
    'Adding a printer that is connected to the LAN.',
    ['New printer not listed', 'Need consistent printing for several users'],
    ['IP changes under DHCP', 'Wrong driver chosen', 'Firewall blocks'],
    [['Connect the printer to the LAN and print a configuration page to get its IP/MAC.'],
     ['Reserve its IP in DHCP (by MAC) or set a static IP outside the DHCP scope; record it in the IP Tracker.'],
     ['Ping it.', 'ping <printer-ip>', 'Replies.'],
     ['Settings → Printers & scanners → Add → “The printer that I want isn’t listed” → Add a printer using an IP address or hostname → Device type: TCP/IP device.'],
     ['Select the correct manufacturer driver (install it first if not listed) and print a test page.'],
     ['Share via print server or deploy via Group Policy if many users need it.']],
    ['Document IP, model, serial and location in the Inventory tool.'],
    ['Print server/GPO deployment needs the server team.'],
    ['Do not leave default admin passwords on the printer’s web interface.']);

  G('printer', 'scanner', 'Scanner Not Detected',
    'স্ক্যানার না পেলে USB/নেটওয়ার্ক সংযোগ, ড্রাইভার ও Windows Image Acquisition (WIA) সার্ভিস চেক করুন।',
    'A scanner or multifunction device does not appear or fails to scan.',
    ['“No scanner detected”', 'Scan button does nothing', 'Network scan to folder fails'],
    ['Cable/USB or power issue', 'Missing scanner driver', 'WIA service stopped', 'Network scan path/credentials wrong'],
    [['Check power, USB cable/port (or network link) and that the scanner lock/lamp is released.'],
     ['Check the Windows Image Acquisition service.', 'Get-Service stisvc', 'Running'],
     ['Device Manager → Imaging devices: look for warnings; reinstall the vendor’s scan driver/software.', 'devmgmt.msc'],
     ['Try Windows Scan app and the vendor app.'],
     ['Scan-to-folder: confirm the share path (\\\\server\\share), account and permissions from the printer panel.']],
    ['Reinstall driver; start the service; use another port.'],
    ['Scan-to-email/SMB needs mail or file server configuration.'],
    ['Do not store the scan account’s password in documents or shared sheets.']);

  G('printer', 'projector', 'Projector Display Problems',
    'প্রজেক্টরে ছবি না এলে ক্যাবল, ইনপুট সোর্স ও Win+P (Duplicate/Extend) চেক করুন; রেজোলিউশন কম রাখুন।',
    'No image, wrong colours, or a blurred/cut-off picture on a projector.',
    ['“No signal”', 'Image offset or stretched', 'Colour tint'],
    ['Wrong input source', 'Loose or bad cable/adapter', 'Display mode not set', 'Resolution not supported', 'Lamp or lens issue'],
    [['Power the projector on and select the correct input (HDMI/VGA) with its remote.'],
     ['Reseat the cable/adapter; try another cable.'],
     ['On the laptop press Win+P and choose Duplicate or Extend.'],
     ['Settings → Display: lower the resolution/refresh rate (e.g. 1920×1080 @ 60 Hz or 1280×720).'],
     ['Adjust keystone/zoom/focus on the projector; check the lamp/filter warning lights.']],
    ['Replace cable/adapters; update the graphics driver.', 'Clean the filter; replace the lamp when dim.'],
    ['Lamp/board failure — vendor service.'],
    ['Let the projector cool down before unplugging it.']);

  G('printer', 'keyboard-mouse', 'Keyboard and Mouse Problems',
    'কিবোর্ড/মাউস না চললে ব্যাটারি/রিসিভার, পোর্ট, ড্রাইভার ও অন্য পিসিতে টেস্ট করুন।',
    'Keys or pointer do not respond, or respond erratically.',
    ['No input at all', 'Double typing, sticky keys', 'Cursor jumps/lags'],
    ['Dead battery or unpaired wireless device', 'Faulty port/cable', 'Driver or filter keys enabled', 'Dirty sensor/keys', 'USB power saving'],
    [['Replace batteries; reseat the USB receiver in a different port, or re-pair Bluetooth devices.'],
     ['Test the device on another PC.'],
     ['Settings → Accessibility: ensure Filter/Sticky keys are off.'],
     ['Device Manager → Keyboards / Mice: uninstall the device and restart.', 'devmgmt.msc'],
     ['Clean the optical sensor/keys; use a non-glossy surface.']],
    ['Replace faulty devices; use USB ports on the back of desktops.'],
    ['Built-in laptop keyboard/touchpad failure (warranty/repair).'],
    ['Do not spray liquids directly onto keyboards.']);

  G('printer', 'usb-errors', 'USB Device Errors (Peripherals)',
    'USB ডিভাইসে error এলে পোর্ট/কেবল বদলান, পাওয়ার সরবরাহ দেখুন ও ড্রাইভার ইনস্টল করুন।',
    'Peripherals report errors such as “Device descriptor request failed” or “Code 43”.',
    ['Code 43 in Device Manager', '“Device descriptor request failed”', 'Intermittent disconnects'],
    ['Cable/port damage', 'Insufficient power', 'Driver conflict', 'Device hardware fault'],
    [['Move the device to a direct (not hub) USB port and try a different cable.'],
     ['Unplug other USB devices and test one at a time.'],
     ['Device Manager → show hidden devices → uninstall greyed-out USB entries → restart.', 'devmgmt.msc'],
     ['Install chipset and the device driver from the manufacturer.'],
     ['Try another PC.']],
    ['Replace cable/port; use a powered hub for high-draw devices.'],
    ['Device fails on all PCs.'],
    []);

  G('printer', 'audio-peripherals', 'Audio Device Troubleshooting (Speakers, Headsets, Conference)',
    'স্পিকার/হেডসেটে সাউন্ড না এলে সঠিক ডিভাইস নির্বাচন, ভলিউম, কেবল ও Bluetooth পেয়ারিং দেখুন।',
    'External speakers, headsets or conference devices do not work.',
    ['No sound from external speakers', 'Bluetooth headset connects but no audio', 'Echo or feedback in meetings'],
    ['Wrong default device', 'Muted/low volume', 'Bluetooth profile issue', 'Faulty cable', 'Meeting app using a different device'],
    [['Check the physical volume knob, mute buttons and cable (3.5 mm/USB).'],
     ['Set the device as default in Sound settings; run the output test.'],
     ['In the meeting app (Teams/Zoom/Meet) choose the same speaker/mic in its audio settings.'],
     ['Bluetooth: remove and re-pair; select “Headphones” (stereo) for listening; “Headset” profile for calls.'],
     ['Restart audio services.', 'Restart-Service Audiosrv', 'No error (run PowerShell as administrator).']],
    ['Update drivers; replace faulty cables; reduce echo by using a headset or lowering speaker volume.'],
    ['Conference-room system needs the AV vendor.'],
    []);

  ITK.data.guides = GUIDES;

  /* ================= renderer ================= */
  function steps(gd) {
    return '<ol>' + gd.steps.map(function (s) {
      return '<li>' + esc(s[0]) + (s[1] ? U.codebox(s[1]) : '') + (s[2] ? '<div class="expect">Expected: ' + esc(s[2]) + '</div>' : '') + '</li>';
    }).join('') + '</ol>';
  }
  function list(a) { return '<ul>' + a.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>'; }
  function guideHTML(gd) {
    return '<details class="guide" id="g-' + esc(gd.id) + '" data-id="' + esc(gd.id) + '"><summary><span>' + esc(gd.title) + '<span class="guide-sum">' + esc(gd.desc) + '</span></span></summary><div class="guide-body">' +
      (gd.warnings.length ? U.alert('warn', '<strong>Safety warnings</strong>' + list(gd.warnings)) : '') +
      (gd.bn ? '<h4>বাংলা সারসংক্ষেপ (Bangla summary)</h4><p class="bn" lang="bn">' + esc(gd.bn) + '</p>' : '') +
      '<h4>Common symptoms</h4>' + list(gd.symptoms) + '<h4>Possible causes</h4>' + list(gd.causes) +
      '<h4>Step-by-step checks (do these manually, in order)</h4>' + steps(gd) +
      '<h4>Suggested corrective actions</h4>' + list(gd.fixes) + '<h4>When to escalate (senior engineer / ISP / vendor)</h4>' + list(gd.escalate) + '</div></details>';
  }
  function hay(gd) {
    return [gd.title, gd.desc, gd.bn, gd.symptoms.join(' '), gd.causes.join(' '), gd.steps.map(function (s) { return s.join(' '); }).join(' '), gd.fixes.join(' ')].join(' ').toLowerCase();
  }
  function render(root, params, cfg) {
    const items = GUIDES.filter(function (x) { return x.cat === cfg.cat; });
    root.innerHTML = cfg.intro +
      '<div class="card"><div class="field"><label for="gq">Search these guides</label><input class="input" id="gq" type="search" placeholder="e.g. dns, 169.254, spooler, slow…" autocomplete="off" value="' + esc(params.q || '') + '"></div><p class="muted" id="gcount" style="margin:8px 0 0" aria-live="polite"></p></div>' +
      (cfg.extra || '') + '<div id="glist"></div>';
    const q = U.$('#gq', root), list2 = U.$('#glist', root), count = U.$('#gcount', root);
    function draw() {
      const toks = q.value.toLowerCase().split(/\s+/).filter(Boolean);
      const shown = items.filter(function (x) { return toks.every(function (t) { return hay(x).indexOf(t) !== -1; }); });
      count.textContent = shown.length + ' of ' + items.length + ' guides' + (toks.length ? ' match' : '');
      list2.innerHTML = shown.length ? shown.map(guideHTML).join('') : '<div class="empty card">No guides match “' + esc(q.value) + '”. Try a shorter keyword such as “dns”, “printer” or “slow”.</div>';
      if (toks.length && shown.length === 1) { const d = list2.querySelector('details'); if (d) d.open = true; }
    }
    q.addEventListener('input', U.debounce(draw, 120));
    draw();
    if (params.open) {
      const d = U.$('#g-' + params.open, root);
      if (d) { d.open = true; setTimeout(function () { d.scrollIntoView({ block: 'start' }); }, 50); }
    }
  }

  const MANUAL = U.alert('info', '<strong>How to use these guides.</strong> Every step is performed <em>manually by you</em> on an authorised computer — this website cannot run commands or inspect your PC. Use the <strong>Copy</strong> buttons, paste into Command Prompt/PowerShell, and compare the result with “Expected”. Work top to bottom: the least disruptive checks come first.');

  ITK.register({
    id: 'net-guides', cat: 'network', icon: 'wifi', title: 'Network Troubleshooting Guides',
    desc: '14 step-by-step guides: no internet, DNS, DHCP, gateway, Wi-Fi, VPN, shared folders, packet loss and more.',
    keywords: 'network internet dns dhcp gateway wifi lan vpn shared folder printer latency packet loss troubleshooting',
    render: function (root, params) { render(root, params, { cat: 'network', intro: MANUAL }); }
  });

  /* hardware extras: calculators the website performs itself */
  const HW_EXTRA = '<details class="card"><summary style="cursor:pointer;font-weight:650">Quick calculators (computed by this page)</summary><div style="margin-top:12px" class="form-grid">' +
    '<div><h3>Battery health %</h3><div class="field"><label for="b-d">Design capacity (mWh)</label><input class="input" id="b-d" inputmode="numeric" placeholder="e.g. 48000"></div><div class="field" style="margin-top:8px"><label for="b-f">Full charge capacity (mWh)</label><input class="input" id="b-f" inputmode="numeric" placeholder="e.g. 36500"></div><p id="b-out" aria-live="polite" style="margin-top:8px"></p><div class="help">Read both values from the report made by <code>powercfg /batteryreport</code>.</div></div>' +
    '<div><h3>Disk free space %</h3><div class="field"><label for="d-t">Total size (GB)</label><input class="input" id="d-t" inputmode="decimal" placeholder="e.g. 476"></div><div class="field" style="margin-top:8px"><label for="d-f">Free space (GB)</label><input class="input" id="d-f" inputmode="decimal" placeholder="e.g. 38"></div><p id="d-out" aria-live="polite" style="margin-top:8px"></p><div class="help">Rule of thumb: keep roughly 10–15% free for good performance and updates.</div></div></div></details>';
  function hwCalc(root) {
    function num(el) { const v = el.value.trim(); return v === '' ? null : Number(v); }
    function bat() {
      const d = num(U.$('#b-d', root)), f = num(U.$('#b-f', root)), o = U.$('#b-out', root);
      if (d === null && f === null) { o.textContent = ''; return; }
      if (d === null || f === null || !isFinite(d) || !isFinite(f) || d <= 0 || f < 0) { o.innerHTML = '<span class="error" style="display:block">Enter both capacities as positive numbers.</span>'; return; }
      if (f > d * 1.3) { o.innerHTML = '<span class="error" style="display:block">Full charge capacity is far above design capacity — check the numbers.</span>'; return; }
      const p = f / d * 100, kind = p >= 80 ? 'success' : (p >= 60 ? 'warn' : 'danger');
      o.innerHTML = U.badge(p.toFixed(1) + '% of design capacity', kind) + ' ' + (p >= 80 ? 'Healthy.' : (p >= 60 ? 'Worn — plan a replacement.' : 'Heavily worn — consider replacing.'));
    }
    function disk() {
      const t = num(U.$('#d-t', root)), f = num(U.$('#d-f', root)), o = U.$('#d-out', root);
      if (t === null && f === null) { o.textContent = ''; return; }
      if (t === null || f === null || !isFinite(t) || !isFinite(f) || t <= 0 || f < 0 || f > t) { o.innerHTML = '<span class="error" style="display:block">Enter total size (>0) and free space (0 – total).</span>'; return; }
      const p = f / t * 100;
      o.innerHTML = U.badge(p.toFixed(1) + '% free', p >= 15 ? 'success' : (p >= 10 ? 'warn' : 'danger')) + ' ' + (p >= 15 ? 'Fine.' : (p >= 10 ? 'Getting low.' : 'Low — free up space.'));
    }
    ['#b-d', '#b-f'].forEach(function (s) { U.$(s, root).addEventListener('input', bat); });
    ['#d-t', '#d-f'].forEach(function (s) { U.$(s, root).addEventListener('input', disk); });
  }
  ITK.register({
    id: 'hw-guides', cat: 'hardware', icon: 'monitor', title: 'Hardware & Windows Support Guides',
    desc: '16 guides: no power, no display, slow PC, BSOD, drivers, updates, battery, disk health, overheating, USB and more.',
    keywords: 'hardware windows slow cpu ram disk boot bsod blue screen driver update battery ssd hdd overheating audio usb power display',
    render: function (root, params) {
      render(root, params, { cat: 'hardware', intro: MANUAL + U.alert('warn', '<strong>Manual vs calculated.</strong> Diagnosis and repair steps are manual. Only the small calculators below are computed by this page. Back up important data before repairs, and do not open devices under warranty.'), extra: HW_EXTRA });
      hwCalc(root);
    }
  });
  ITK.register({
    id: 'printer-guides', cat: 'printer', icon: 'printer', title: 'Printer & Peripheral Support',
    desc: 'Printer offline, stuck queue, drivers, network printer setup, scanner, projector, keyboard/mouse, USB and audio.',
    keywords: 'printer offline queue spooler driver scanner projector keyboard mouse usb audio peripheral',
    render: function (root, params) { render(root, params, { cat: 'printer', intro: MANUAL }); }
  });
})(typeof window !== 'undefined' ? window : globalThis);
