"""
Dynamic Enterprise Agent Installer Generator.
Generates hardened POSIX shell script for 1-line agent enrollment,
automated daily cron audits, and outbound HTTPS reporting.
"""

def generate_installer_script(server_url: str, default_token: str = "") -> str:
    """
    Generate dynamic install.sh script with embedded server URL and token parsing.
    """
    return f"""#!/bin/sh
# ==============================================================================
# Lynislens Enterprise Agent — 1-Line Outbound Onboarding Script
# ==============================================================================

set -e

# Default settings
SERVER_URL="{server_url}"
TOKEN="{default_token}"
CRON_SCHEDULE="daily"

# Parse CLI arguments (--token, --server, --cron)
while [ "$#" -gt 0 ]; do
  case "$1" in
    --token)
      TOKEN="$2"
      shift 2
      ;;
    --server)
      SERVER_URL="$2"
      shift 2
      ;;
    --cron)
      CRON_SCHEDULE="$2"
      shift 2
      ;;
    *)
      shift 1
      ;;
  esac
done

if [ "$(id -u)" -ne 0 ]; then
  echo "[!] Error: This installation script must be run as root (use sudo)." >&2
  exit 1
fi

if [ -z "$TOKEN" ]; then
  echo "[!] Error: No enrollment token provided. Pass --token <LL-TOKEN-XXXX>" >&2
  exit 1
fi

echo "============================================================"
echo "      Lynislens Enterprise Agent — Automated Onboarding     "
echo "============================================================"
echo "[*] Central Server:  $SERVER_URL"
echo "[*] Enrollment Token: $TOKEN"
echo ""

# 1. Ensure curl is installed
if ! command -v curl >/dev/null 2>&1; then
  echo "[*] Installing curl dependency..."
  if command -v apt-get >/dev/null 2>&1; then
    DEBIAN_FRONTEND=noninteractive apt-get update -qq && apt-get install -y -qq curl >/dev/null 2>&1
  elif command -v dnf >/dev/null 2>&1; then
    dnf install -y curl >/dev/null 2>&1
  elif command -v yum >/dev/null 2>&1; then
    yum install -y curl >/dev/null 2>&1
  elif command -v pacman >/dev/null 2>&1; then
    pacman -Sy --noconfirm curl >/dev/null 2>&1
  fi
fi

# 2. Check for Lynis or install lightweight standalone engine
echo "[*] Checking Lynis security audit engine..."
export PATH="$PATH:/usr/sbin:/sbin:/usr/local/sbin:/usr/local/bin:/opt/lynis"

LYNIS_BIN=""
if command -v lynis >/dev/null 2>&1; then
  LYNIS_BIN="$(command -v lynis)"
elif [ -x "/usr/sbin/lynis" ]; then
  LYNIS_BIN="/usr/sbin/lynis"
elif [ -x "/usr/bin/lynis" ]; then
  LYNIS_BIN="/usr/bin/lynis"
elif [ -x "/opt/lynis/lynis" ]; then
  LYNIS_BIN="/opt/lynis/lynis"
fi

if [ -z "$LYNIS_BIN" ]; then
  echo "[*] Lynis not detected. Setting up standalone Lynis engine..."
  if command -v git >/dev/null 2>&1; then
    git clone --depth=1 https://github.com/CISOfy/lynis.git /opt/lynis >/dev/null 2>&1 || true
    if [ -x "/opt/lynis/lynis" ]; then
      ln -sf /opt/lynis/lynis /usr/local/bin/lynis
      LYNIS_BIN="/opt/lynis/lynis"
    fi
  fi
  
  if [ -z "$LYNIS_BIN" ]; then
    if command -v apt-get >/dev/null 2>&1; then
      DEBIAN_FRONTEND=noninteractive apt-get install -y -qq lynis >/dev/null 2>&1 || true
    elif command -v dnf >/dev/null 2>&1; then
      dnf install -y lynis >/dev/null 2>&1 || true
    fi
  fi
fi

# Final binary check
if [ -z "$LYNIS_BIN" ] && command -v lynis >/dev/null 2>&1; then
  LYNIS_BIN="$(command -v lynis)"
fi

if [ -z "$LYNIS_BIN" ] || [ ! -x "$LYNIS_BIN" ]; then
  echo "[!] Failed to find or install Lynis automatically."
  echo "    Please run 'apt install lynis' or 'dnf install lynis', then re-run this script."
  exit 1
fi

echo "[✔] Lynis binary ready at: $LYNIS_BIN"

# 3. Create persistent Lynislens Agent runner script (/usr/local/bin/lynislens-scan)
mkdir -p /etc/lynislens
cat << 'EOF_CONF' > /etc/lynislens/agent.conf
SERVER_URL="{server_url}"
TOKEN="{default_token}"
LYNIS_BIN=""
EOF_CONF

# Update configuration file with actual values
sed -i "s|SERVER_URL=.*|SERVER_URL=\"$SERVER_URL\"|" /etc/lynislens/agent.conf
sed -i "s|TOKEN=.*|TOKEN=\"$TOKEN\"|" /etc/lynislens/agent.conf
sed -i "s|LYNIS_BIN=.*|LYNIS_BIN=\"$LYNIS_BIN\"|" /etc/lynislens/agent.conf

cat << 'EOF_RUNNER' > /usr/local/bin/lynislens-scan
#!/bin/sh
set -e

if [ -f /etc/lynislens/agent.conf ]; then
  . /etc/lynislens/agent.conf
fi

LYNIS_CMD="${{LYNIS_BIN:-lynis}}"
REPORT_FILE="/var/log/lynis-report.dat"
TMP_REPORT="/tmp/lynis-report.dat"

echo "[*] Running Lynislens security audit..."
export PATH="$PATH:/usr/sbin:/sbin:/usr/local/sbin:/usr/local/bin:/opt/lynis"

$LYNIS_CMD audit system --quick --cronjob --auditor Lynislens --report-file "$TMP_REPORT" >/dev/null 2>&1 || true

TARGET_REPORT="$TMP_REPORT"
if [ ! -f "$TARGET_REPORT" ] && [ -f "$REPORT_FILE" ]; then
  TARGET_REPORT="$REPORT_FILE"
fi

if [ ! -f "$TARGET_REPORT" ]; then
  echo "[!] Error: Lynis report file was not generated." >&2
  exit 1
fi

HOSTNAME="$(hostname 2>/dev/null || echo 'linux-host')"
IP_ADDR="$(hostname -I 2>/dev/null | awk '{{print $1}}' || echo '')"

echo "[*] Publishing security posture report to Lynislens dashboard..."
HTTP_CODE=$(curl -s -w "%{{http_code}}" -o /tmp/lynislens-resp.json -X POST "$SERVER_URL/api/agent/report" \
  -H "X-Agent-Token: $TOKEN" \
  -H "X-Host-Name: $HOSTNAME" \
  -H "X-Host-IP: $IP_ADDR" \
  -H "Content-Type: text/plain" \
  --data-binary @"$TARGET_REPORT")

if [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -lt 300 ]; then
  echo "[✔] Audit successfully published to Central Dashboard!"
else
  echo "[!] Failed to push report (HTTP $HTTP_CODE). Check connection to $SERVER_URL." >&2
  cat /tmp/lynislens-resp.json 2>/dev/null || true
  exit 1
fi
EOF_RUNNER

chmod +x /usr/local/bin/lynislens-scan

# 4. Configure Automated Scheduled Cron Job (/etc/cron.d/lynislens-audit)
mkdir -p /etc/cron.d

CRON_EXPR="0 3 * * *"
CRON_DESC="Daily at 03:00 AM"

case "$CRON_SCHEDULE" in
  5m|5min|5)
    CRON_EXPR="*/5 * * * *"
    CRON_DESC="Every 5 Minutes (Real-Time SecOps)"
    ;;
  15m|15min|15)
    CRON_EXPR="*/15 * * * *"
    CRON_DESC="Every 15 Minutes (Active Hardening)"
    ;;
  30m|30min|30)
    CRON_EXPR="*/30 * * * *"
    CRON_DESC="Every 30 Minutes"
    ;;
  1h|60m|hourly)
    CRON_EXPR="0 * * * *"
    CRON_DESC="Hourly (Every 60 Minutes)"
    ;;
  daily|*)
    CRON_EXPR="0 3 * * *"
    CRON_DESC="Daily at 03:00 AM"
    ;;
esac

# Remove old daily script if present to avoid duplicate runs
rm -f /etc/cron.daily/lynislens-audit

cat << EOF_CRON > /etc/cron.d/lynislens-audit
# Lynislens Enterprise Automated Audit Schedule ($CRON_DESC)
SHELL=/bin/sh
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin
$CRON_EXPR root /usr/local/bin/lynislens-scan >/dev/null 2>&1
EOF_CRON

chmod 0644 /etc/cron.d/lynislens-audit

echo "[*] Executing initial baseline security scan..."
/usr/local/bin/lynislens-scan

echo ""
echo "============================================================"
echo " [✔] Lynislens Enterprise Agent Setup Complete!            "
echo "============================================================"
echo " • Automated Schedule:    $CRON_DESC (/etc/cron.d/lynislens-audit)"
echo " • Manual Trigger:        sudo lynislens-scan               "
echo " • Live Status:           Synced with Central Dashboard     "
echo "============================================================"
"""
