#!/bin/bash
# init-ssl.sh - Initialize Nginx + Certbot on EC2 instance
# This script is called by GitHub Actions during deploy
set -euo pipefail

DOMAIN="${1:-livecommerce.duckdns.org}"
EMAIL="${2:-admin@livesale.bo}"

echo "🔐 Initializing SSL/TLS with Nginx + Certbot for domain: $DOMAIN"

install_packages() {
    if command -v apt-get >/dev/null 2>&1; then
        sudo apt-get update
        sudo DEBIAN_FRONTEND=noninteractive apt-get install -y nginx certbot python3-certbot-nginx
    elif command -v dnf >/dev/null 2>&1; then
        sudo dnf install -y nginx certbot python3-certbot-nginx
    elif command -v yum >/dev/null 2>&1; then
        sudo yum install -y nginx certbot python3-certbot-nginx
    else
        echo "❌ No supported package manager found (apt-get, dnf, yum)"
        exit 1
    fi
}

# Install Nginx and Certbot if not present
if ! command -v nginx &> /dev/null; then
    echo "📦 Installing Nginx and Certbot..."
    install_packages
else
    echo "✅ Nginx already installed"
fi

# Create required directories
sudo mkdir -p /var/www/certbot
sudo mkdir -p /etc/letsencrypt/live/$DOMAIN
if id nginx >/dev/null 2>&1; then
    sudo chown -R nginx:nginx /var/www/certbot
elif id www-data >/dev/null 2>&1; then
    sudo chown -R www-data:www-data /var/www/certbot
fi

free_http_ports() {
    if command -v docker >/dev/null 2>&1; then
        echo "🧹 Stopping any Docker containers bound to ports 80/443..."
        sudo docker ps --format '{{.ID}} {{.Ports}}' \
            | awk '/:80->|:443->|0.0.0.0:80|0.0.0.0:443/ {print $1}' \
            | xargs -r sudo docker stop >/dev/null 2>&1 || true
    fi

    echo "🧹 Releasing any leftover listeners on 80/443..."
    sudo fuser -k 80/tcp >/dev/null 2>&1 || true
    sudo fuser -k 443/tcp >/dev/null 2>&1 || true
    sudo systemctl stop nginx >/dev/null 2>&1 || true
}

write_nginx_http_config() {
    echo "📝 Installing temporary Nginx HTTP configuration..."
    sudo tee /etc/nginx/nginx.conf > /dev/null <<EOF
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    server_tokens off;

    server {
        listen 80 default_server;
        listen [::]:80 default_server;
        server_name $DOMAIN;

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location /api/ {
            proxy_pass http://127.0.0.1:8000;
            proxy_http_version 1.1;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
        }

        location /uploads/ {
            proxy_pass http://127.0.0.1:8000;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
        }

        location / {
            proxy_pass http://127.0.0.1:3000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade \$http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
        }
    }
}
EOF
    sudo nginx -t
}

write_nginx_https_config() {
    echo "📝 Installing final Nginx HTTPS configuration..."
    sudo tee /etc/nginx/nginx.conf > /dev/null <<EOF
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    server_tokens off;

    server {
        listen 80 default_server;
        listen [::]:80 default_server;
        server_name $DOMAIN;

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 301 https://\$host\$request_uri;
        }
    }

    server {
        listen 443 ssl http2 default_server;
        listen [::]:443 ssl http2 default_server;
        server_name $DOMAIN;

        ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_prefer_server_ciphers off;

        add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;

        location /api/ {
            proxy_pass http://127.0.0.1:8000;
            proxy_http_version 1.1;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
        }

        location /uploads/ {
            proxy_pass http://127.0.0.1:8000;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
        }

        location / {
            proxy_pass http://127.0.0.1:3000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade \$http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
        }
    }
}
EOF
    sudo nginx -t
}

# Configure temporary HTTP nginx and obtain certificate if needed
free_http_ports
write_nginx_http_config

if [ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    echo "🎯 Generating Let's Encrypt certificate for $DOMAIN..."
    sudo systemctl enable nginx >/dev/null 2>&1 || true
    sudo systemctl start nginx || sudo nginx
    sleep 2

    sudo certbot certonly \
        --webroot \
        -w /var/www/certbot \
        --non-interactive \
        --agree-tos \
        --email "$EMAIL" \
        --domain "$DOMAIN" \
        --expand

    echo "✅ Certificate obtained successfully"
else
    echo "✅ Certificate already exists, skipping generation"
fi

write_nginx_https_config

# Ensure certificate paths exist (fallback to self-signed if missing)
if [ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    echo "⚠️  Certificate not found, creating self-signed fallback..."
    sudo mkdir -p /etc/letsencrypt/live/$DOMAIN
    sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout /etc/letsencrypt/live/$DOMAIN/privkey.pem \
        -out /etc/letsencrypt/live/$DOMAIN/fullchain.pem \
        -subj "/CN=$DOMAIN/O=LiveCommerce Manager/C=BO"
    echo "⚠️  Self-signed certificate created (replace with Let's Encrypt as soon as possible)"
fi

# Setup Certbot auto-renewal with systemd timer
echo "🔄 Setting up automatic certificate renewal..."
sudo systemctl enable certbot.timer || true
sudo systemctl start certbot.timer || true

# Create renewal hook to reload Nginx
sudo mkdir -p /etc/letsencrypt/renewal-hooks/post
sudo tee /etc/letsencrypt/renewal-hooks/post/nginx.sh > /dev/null <<'EOF'
#!/bin/bash
nginx -s reload
EOF
sudo chmod +x /etc/letsencrypt/renewal-hooks/post/nginx.sh

# Start Nginx
echo "🚀 Starting Nginx..."
sudo systemctl enable nginx >/dev/null 2>&1 || true
sudo systemctl restart nginx || sudo systemctl start nginx || sudo nginx

# Verify Nginx is running
if curl -k -s https://127.0.0.1 >/dev/null 2>&1; then
    echo "✅ Nginx is running and HTTPS is working"
else
    echo "⚠️  Nginx may not be responding yet, checking status..."
    sudo systemctl status nginx || true
fi

echo "✅ SSL/TLS initialization complete!"
