#!/bin/bash
# init-ssl.sh - Initialize Nginx + Certbot on EC2 instance
# This script is called by GitHub Actions during deploy
set -euo pipefail

DOMAIN="${1:-livecommerce.duckdns.org}"
EMAIL="${2:-admin@livesale.bo}"

echo "🔐 Initializing SSL/TLS with Nginx + Certbot for domain: $DOMAIN"

# Install Nginx and Certbot if not present
if ! command -v nginx &> /dev/null; then
    echo "📦 Installing Nginx and Certbot..."
    sudo apt-get update
    sudo apt-get install -y nginx certbot python3-certbot-nginx
    sudo systemctl disable nginx  # We'll manage it ourselves
else
    echo "✅ Nginx already installed"
fi

# Create required directories
sudo mkdir -p /var/www/certbot
sudo mkdir -p /etc/letsencrypt/live/$DOMAIN
sudo chown -R nginx:nginx /var/www/certbot

# Copy nginx config
echo "📝 Installing Nginx configuration..."
sudo cp /opt/live-commerce-manager/infra/nginx/nginx.conf /etc/nginx/nginx.conf
sudo nginx -t  # Validate config

# Check if certificate already exists
if [ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    echo "🎯 Generating Let's Encrypt certificate for $DOMAIN..."
    
    # Start Nginx temporarily for ACME challenge (HTTP)
    sudo systemctl start nginx || true
    sleep 2
    
    # Obtain certificate
    sudo certbot certonly \
        --nginx \
        --non-interactive \
        --agree-tos \
        --email "$EMAIL" \
        --domain "$DOMAIN" \
        --expand || {
        echo "⚠️  Certbot failed, retrying with webroot method..."
        sudo systemctl stop nginx || true
        
        # Fallback: webroot method
        sudo certbot certonly \
            --webroot \
            -w /var/www/certbot \
            --non-interactive \
            --agree-tos \
            --email "$EMAIL" \
            --domain "$DOMAIN" \
            --expand || {
            echo "❌ Failed to obtain certificate. Manual intervention may be needed."
            exit 1
        }
    }
    
    echo "✅ Certificate obtained successfully"
else
    echo "✅ Certificate already exists, skipping generation"
fi

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
sudo systemctl enable nginx
sudo systemctl restart nginx

# Verify Nginx is running
if curl -k -s https://127.0.0.1 >/dev/null 2>&1; then
    echo "✅ Nginx is running and HTTPS is working"
else
    echo "⚠️  Nginx may not be responding yet, checking status..."
    sudo systemctl status nginx || true
fi

echo "✅ SSL/TLS initialization complete!"
