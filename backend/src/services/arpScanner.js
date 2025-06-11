import { spawn } from 'child_process';
import { promisify } from 'util';
import logger from '../utils/logger.js';

const execFile = promisify(spawn);

export class ArpScanner {
  constructor() {
    this.isScanning = false;
  }

  async scanNetwork(networkInterfaces, subnets, timeout = 30) {
    if (this.isScanning) {
      throw new Error('Scan already in progress');
    }

    this.isScanning = true;
    const startTime = Date.now();
    
    try {
      const devices = [];
      
      for (const subnet of subnets) {
        for (const networkInterface of networkInterfaces) {
          logger.info(`Scanning subnet ${subnet} on interface ${networkInterface}`);
          
          const scanResults = await this.executeArpScan(networkInterface, subnet, timeout);
          devices.push(...scanResults);
        }
      }

      // Remove duplicates based on MAC address
      const uniqueDevices = this.removeDuplicates(devices);
      
      const executionTime = Date.now() - startTime;
      logger.info(`Scan completed in ${executionTime}ms, found ${uniqueDevices.length} devices`);
      
      return {
        devices: uniqueDevices,
        executionTime,
        status: 'success'
      };
    } catch (error) {
      logger.error('Scan failed:', error);
      return {
        devices: [],
        executionTime: Date.now() - startTime,
        status: 'error',
        error: error.message
      };
    } finally {
      this.isScanning = false;
    }
  }

  async executeArpScan(networkInterface, subnet, timeout) {
    return new Promise((resolve, reject) => {
      const args = ['-I', networkInterface, subnet];
      const arpScan = spawn('arp-scan', args);
      
      let stdout = '';
      let stderr = '';
      
      arpScan.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      arpScan.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      arpScan.on('close', (code) => {
        if (code !== 0) {
          logger.error(`arp-scan exited with code ${code}: ${stderr}`);
          reject(new Error(`arp-scan failed: ${stderr}`));
          return;
        }
        
        try {
          const devices = this.parseArpScanOutput(stdout);
          resolve(devices);
        } catch (error) {
          reject(error);
        }
      });
      
      arpScan.on('error', (error) => {
        logger.error('Failed to start arp-scan:', error);
        reject(new Error(`Failed to execute arp-scan: ${error.message}`));
      });
    });
  }

  parseArpScanOutput(output) {
    const devices = [];
    const lines = output.split('\n');
    
    for (const line of lines) {
      // Skip header lines and empty lines
      if (line.startsWith('Interface:') || 
          line.startsWith('Starting arp-scan') || 
          line.includes('packets received') ||
          line.includes('Ending arp-scan') ||
          line.trim() === '') {
        continue;
      }
      
      // Parse device line: IP MAC VENDOR
      const match = line.match(/^(\d+\.\d+\.\d+\.\d+)\s+([0-9a-fA-F:]{17})\s+(.*)$/);
      if (match) {
        const [, ip, mac, vendor] = match;
        devices.push({
          ip: ip.trim(),
          mac: mac.toLowerCase().trim(),
          vendor: vendor.trim() || 'Unknown'
        });
      }
    }
    
    return devices;
  }

  removeDuplicates(devices) {
    const seen = new Set();
    return devices.filter(device => {
      const key = device.mac;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  async checkArpScanAvailable() {
    return new Promise((resolve) => {
      const check = spawn('which', ['arp-scan']);
      check.on('close', (code) => {
        resolve(code === 0);
      });
      check.on('error', () => {
        resolve(false);
      });
    });
  }
}

export default new ArpScanner();