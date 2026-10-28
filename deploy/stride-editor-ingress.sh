#!/bin/sh
set -eu
mode=${1:-apply}
case "$mode" in apply|remove);; *) exit 2;; esac
command -v iptables >/dev/null 2>&1 || exit 1
command -v ip6tables >/dev/null 2>&1 || exit 1
iface=$(ip -o route show default | awk 'NR==1{print $5}')
[ -n "$iface" ] || exit 1
for firewall in iptables ip6tables; do
 command -v "$firewall" >/dev/null 2>&1 || continue
 if [ "$mode" = apply ]; then
  "$firewall" -C INPUT -i "$iface" -p tcp --dport 8080 -m comment --comment stride-editor-private -j REJECT --reject-with tcp-reset 2>/dev/null || "$firewall" -I INPUT 1 -i "$iface" -p tcp --dport 8080 -m comment --comment stride-editor-private -j REJECT --reject-with tcp-reset
  if "$firewall" -S DOCKER-USER >/dev/null 2>&1; then
   "$firewall" -C DOCKER-USER -i "$iface" -p tcp -m conntrack --ctorigdstport 8080 -m comment --comment stride-editor-private -j REJECT --reject-with tcp-reset 2>/dev/null || "$firewall" -I DOCKER-USER 1 -i "$iface" -p tcp -m conntrack --ctorigdstport 8080 -m comment --comment stride-editor-private -j REJECT --reject-with tcp-reset
  fi
 else
  "$firewall" -D INPUT -i "$iface" -p tcp --dport 8080 -m comment --comment stride-editor-private -j REJECT --reject-with tcp-reset 2>/dev/null || true
  "$firewall" -D DOCKER-USER -i "$iface" -p tcp -m conntrack --ctorigdstport 8080 -m comment --comment stride-editor-private -j REJECT --reject-with tcp-reset 2>/dev/null || true
 fi
done
