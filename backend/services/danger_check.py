"""Service to detect destructive/dangerous commands in shell scripts."""
import re

DANGEROUS_PATTERNS = [
    (r'rm\s+(-[a-zA-Z]*f[a-zA-Z]*\s+)?(-[a-zA-Z]*r[a-zA-Z]*\s+)?(/|~|\$HOME|\*)', "rm -rf: Recursive forced deletion of files/directories"),
    (r'rm\s+(-[a-zA-Z]*r[a-zA-Z]*\s+)?(-[a-zA-Z]*f[a-zA-Z]*\s+)?(/|~|\$HOME|\*)', "rm -rf: Recursive forced deletion of files/directories"),
    (r'dd\s+if=', "dd: Low-level disk write — can overwrite entire partitions"),
    (r'mkfs\.?\w*\s+/dev/', "mkfs: Formats a filesystem — all data will be lost"),
    (r':\(\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;\s*:', "Fork bomb: Will crash the system"),
    (r'>\s*/dev/sd[a-z]', "Direct write to disk device — extremely dangerous"),
    (r'chmod\s+(-R\s+)?777\s+/', "chmod 777 /: Removes all permission restrictions"),
    (r'chown\s+(-R\s+)?\w+:\w+\s+/', "chown /: Recursive ownership change on root"),
    (r'wget\s+.+\|\s*(ba)?sh', "Piping remote script to shell — potential malware"),
    (r'curl\s+.+\|\s*(ba)?sh', "Piping remote script to shell — potential malware"),
    (r'>\s*/etc/passwd', "Overwriting /etc/passwd — will break authentication"),
    (r'>\s*/etc/shadow', "Overwriting /etc/shadow — will break authentication"),
    (r'mv\s+.+\s+/dev/null', "Moving files to /dev/null — permanent data loss"),
    (r'echo\s+.+>\s*/dev/sd[a-z]', "Writing directly to disk device"),
    (r'shred\s+', "shred: Securely overwrites files — unrecoverable"),
    (r'wipefs\s+', "wipefs: Wipes filesystem signatures"),
    (r'sgdisk\s+--zap-all', "sgdisk --zap-all: Destroys all partition data"),
    (r'parted\s+.*\s+rm\s+', "parted rm: Deletes disk partitions"),
    (r'fdisk\s+/dev/', "fdisk: Manual partition manipulation"),
    (r'systemctl\s+(disable|mask)\s+(systemd-resolved|NetworkManager|sshd)', "Disabling critical system service"),
]

# Compiled patterns for performance
_COMPILED_PATTERNS = [(re.compile(p, re.IGNORECASE | re.MULTILINE), desc) for p, desc in DANGEROUS_PATTERNS]


def check_destructive_commands(code: str) -> list:
    """Analyze code for destructive commands. Returns list of warning dicts."""
    warnings = []
    seen_descriptions = set()
    for pattern, description in _COMPILED_PATTERNS:
        matches = pattern.finditer(code)
        for match in matches:
            if description in seen_descriptions:
                continue
            seen_descriptions.add(description)
            line_num = code[:match.start()].count('\n') + 1
            warnings.append({
                "line": line_num,
                "matched": match.group(0).strip()[:80],
                "description": description,
            })
    return warnings
