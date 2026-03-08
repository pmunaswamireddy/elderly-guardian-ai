"""Generate a self-signed ROOT CA + server certificate for HTTPS development.
The CA cert is installed into the Windows Trusted Root store so browsers
show no warnings. The server cert is used by both Vite and uvicorn."""
import os
import sys
import socket
import ipaddress
import subprocess

CERT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "certs")
CA_CERT = os.path.join(CERT_DIR, "ca.pem")
CA_KEY  = os.path.join(CERT_DIR, "ca-key.pem")
CERT_FILE = os.path.join(CERT_DIR, "cert.pem")
KEY_FILE  = os.path.join(CERT_DIR, "key.pem")

def get_local_ips():
    """Get all local IP addresses for SAN entries."""
    ips = set()
    ips.add("127.0.0.1")
    try:
        # Get the primary LAN IP
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ips.add(s.getsockname()[0])
        s.close()
    except Exception:
        pass
    # Also try hostname resolution
    try:
        hostname = socket.gethostname()
        for info in socket.getaddrinfo(hostname, None, socket.AF_INET):
            ips.add(info[4][0])
    except Exception:
        pass
    return list(ips)

def generate():
    os.makedirs(CERT_DIR, exist_ok=True)

    try:
        from cryptography import x509
        from cryptography.x509.oid import NameOID
        from cryptography.hazmat.primitives import hashes, serialization
        from cryptography.hazmat.primitives.asymmetric import rsa
        from datetime import datetime, timedelta, timezone
    except ImportError:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "cryptography", "-q"])
        from cryptography import x509
        from cryptography.x509.oid import NameOID
        from cryptography.hazmat.primitives import hashes, serialization
        from cryptography.hazmat.primitives.asymmetric import rsa
        from datetime import datetime, timedelta, timezone

    local_ips = get_local_ips()
    print(f"[SSL] Detected local IPs: {local_ips}")

    # ── Step 1: Generate a Root CA ──
    print("[SSL] Generating Root CA...")
    ca_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    ca_name = x509.Name([
        x509.NameAttribute(NameOID.COMMON_NAME, "Elderly Guardian AI Local CA"),
        x509.NameAttribute(NameOID.ORGANIZATION_NAME, "Guardian Dev"),
    ])
    ca_cert = (
        x509.CertificateBuilder()
        .subject_name(ca_name)
        .issuer_name(ca_name)
        .public_key(ca_key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(datetime.now(timezone.utc))
        .not_valid_after(datetime.now(timezone.utc) + timedelta(days=3650))
        .add_extension(x509.BasicConstraints(ca=True, path_length=None), critical=True)
        .sign(ca_key, hashes.SHA256())
    )

    with open(CA_KEY, "wb") as f:
        f.write(ca_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.TraditionalOpenSSL,
            encryption_algorithm=serialization.NoEncryption(),
        ))
    with open(CA_CERT, "wb") as f:
        f.write(ca_cert.public_bytes(serialization.Encoding.PEM))

    # ── Step 2: Generate Server Certificate signed by CA ──
    print("[SSL] Generating Server Certificate...")
    server_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)

    san_entries = [x509.DNSName("localhost")]
    for ip in local_ips:
        san_entries.append(x509.IPAddress(ipaddress.IPv4Address(ip)))

    server_name = x509.Name([
        x509.NameAttribute(NameOID.COMMON_NAME, "localhost"),
        x509.NameAttribute(NameOID.ORGANIZATION_NAME, "Guardian Dev"),
    ])

    server_cert = (
        x509.CertificateBuilder()
        .subject_name(server_name)
        .issuer_name(ca_name)
        .public_key(server_key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(datetime.now(timezone.utc))
        .not_valid_after(datetime.now(timezone.utc) + timedelta(days=365))
        .add_extension(
            x509.SubjectAlternativeName(san_entries),
            critical=False,
        )
        .sign(ca_key, hashes.SHA256())
    )

    with open(KEY_FILE, "wb") as f:
        f.write(server_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.TraditionalOpenSSL,
            encryption_algorithm=serialization.NoEncryption(),
        ))
    # Write server cert + CA cert chain into cert.pem
    with open(CERT_FILE, "wb") as f:
        f.write(server_cert.public_bytes(serialization.Encoding.PEM))
        f.write(ca_cert.public_bytes(serialization.Encoding.PEM))

    print(f"[SSL] CA Certificate:     {CA_CERT}")
    print(f"[SSL] Server Certificate: {CERT_FILE}")
    print(f"[SSL] Server Key:         {KEY_FILE}")

    # ── Step 3: Install CA into Windows Trusted Root Store ──
    print("[SSL] Installing CA into Windows Trusted Root Certificate Authorities...")
    try:
        result = subprocess.run(
            ["certutil", "-addstore", "-user", "Root", CA_CERT],
            capture_output=True, text=True
        )
        if result.returncode == 0:
            print("[SSL] ✅ CA installed successfully! Browsers will now trust your local HTTPS.")
            print("[SSL] ⚠️  You may need to RESTART your browser for the change to take effect.")
        else:
            print(f"[SSL] ⚠️  certutil returned code {result.returncode}: {result.stderr}")
            print("[SSL] You may need to run this as Administrator.")
    except Exception as e:
        print(f"[SSL] Could not auto-install CA: {e}")
        print(f"[SSL] Manually import {CA_CERT} into 'Trusted Root Certification Authorities'")

    return True

if __name__ == "__main__":
    generate()
