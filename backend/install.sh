#!/bin/bash

# ARP Monitoring System Installation Script for Rocky Linux 9
# This script installs and configures the ARP monitoring backend

set -e

echo "=== ARP Monitoring System Installation ==="
echo "Installing on Rocky Linux 9..."

# Update system
echo "Updating system packages..."
sudo dnf update -y

# Install required packages (continue on failure)
echo "Installing required packages..."
sudo dnf install -y epel-release || true
sudo dnf install -y nodejs npm arp-scan git || true

# Check arp-scan installation (but don't exit if not found)
if ! command -v arp-scan &> /dev/null; then
    echo "Warning: arp-scan could not be installed or found - proceeding anyway"
else
    echo "arp-scan version: $(arp-scan --version | head -n1)"
fi

# Create application directory
APP_DIR="/opt/arp-monitoring"
echo "Creating application directory: $APP_DIR"
sudo mkdir -p $APP_DIR
sudo chown $USER:$USER $APP_DIR

# Copy application files
echo "Copying application files..."
cp -r /root/project/backend/* $APP_DIR/

# Install Node.js dependencies
echo "Installing Node.js dependencies..."
cd $APP_DIR
npm install || echo "Warning: npm install encountered issues - proceeding anyway"

# Create data and logs directories
mkdir -p data logs

# Copy environment file
if [ ! -f .env ]; then
    cp .env.example .env
    echo "Created .env file. Please review and update the configuration."
fi

# Create systemd service
echo "Creating systemd service..."
sudo tee /etc/systemd/system/arp-monitoring.service > /dev/null <<EOF
[Unit]
Description=ARP Network Monitoring Service
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$APP_DIR
Environment=NODE_ENV=production
ExecStart=/usr/bin/node src/server.js
Restart=always
RestartSec=10

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$APP_DIR

[Install]
WantedBy=multi-user.target
EOF

# Set up log rotation
echo "Setting up log rotation..."
sudo tee /etc/logrotate.d/arp-monitoring > /dev/null <<EOF
$APP_DIR/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    copytruncate
}
EOF

# Configure firewall (if firewalld is running)
if systemctl is-active --quiet firewalld; then
    echo "Configuring firewall..."
    sudo firewall-cmd --permanent --add-port=3001/tcp || true
    sudo firewall-cmd --reload || true
fi

# Set appropriate permissions
echo "Setting permissions..."
chmod +x $APP_DIR/src/server.js

# Enable and start service
echo "Enabling and starting service..."
sudo systemctl daemon-reload
sudo systemctl enable arp-monitoring
sudo systemctl start arp-monitoring || echo "Warning: Failed to start service - proceeding anyway"

# Check service status
echo "Checking service status..."
sleep 3
if systemctl is-active --quiet arp-monitoring; then
    echo "✅ ARP Monitoring service is running successfully!"
    echo "Service status:"
    sudo systemctl status arp-monitoring --no-pager -l
else
    echo "❌ Service failed to start. Checking logs..."
    sudo journalctl -u arp-monitoring --no-pager -l
    echo "Warning: Service failed to start but proceeding with installation"
fi

echo ""
echo "=== Installation Complete ==="
echo "The ARP Monitoring backend installation process has completed."
echo ""
echo "Note: Some components may not be fully functional due to installation issues."
echo "Please check the warnings above and address them as needed."
echo ""
echo "Configuration:"
echo "  - Application directory: $APP_DIR"
echo "  - Configuration file: $APP_DIR/.env"
echo "  - Service name: arp-monitoring"
echo "  - Default port: 3001"
echo ""
echo "Useful commands:"
echo "  - Check status: sudo systemctl status arp-monitoring"
echo "  - View logs: sudo journalctl -u arp-monitoring -f"
echo "  - Restart service: sudo systemctl restart arp-monitoring"
echo "  - Edit config: nano $APP_DIR/.env (then restart service)"
