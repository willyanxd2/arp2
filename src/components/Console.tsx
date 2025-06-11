import React, { useState, useRef, useEffect } from 'react';
import { Terminal, Send, Trash2, Copy } from 'lucide-react';

interface CommandHistory {
  command: string;
  output: string;
  timestamp: Date;
  success: boolean;
}

export function Console() {
  const [command, setCommand] = useState('');
  const [history, setHistory] = useState<CommandHistory[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [history]);

  const executeCommand = async () => {
    if (!command.trim() || isExecuting) return;

    setIsExecuting(true);
    const currentCommand = command.trim();
    setCommand('');

    try {
      // Simulate command execution - in a real implementation, this would call the backend
      const response = await simulateCommand(currentCommand);
      
      setHistory(prev => [...prev, {
        command: currentCommand,
        output: response.output,
        timestamp: new Date(),
        success: response.success
      }]);
    } catch (error) {
      setHistory(prev => [...prev, {
        command: currentCommand,
        output: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        success: false
      }]);
    } finally {
      setIsExecuting(false);
    }
  };

  const simulateCommand = async (cmd: string): Promise<{ output: string; success: boolean }> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

    const lowerCmd = cmd.toLowerCase();

    if (lowerCmd.startsWith('arp-scan')) {
      return {
        output: `Interface: eth0, type: EN10MB, MAC: bc:24:11:b0:e7:46, IPv4: 172.31.254.181
Starting arp-scan 1.10.0 with 256 hosts (https://github.com/royhills/arp-scan)
172.31.254.1    80:80:2c:60:65:25       (Unknown)
172.31.254.10   bc:24:11:22:b3:3f       (Unknown)
172.31.254.81   10:60:4b:01:d3:4c       Hewlett Packard
172.31.254.95   92:1a:8e:48:54:6e       (Unknown: locally administered)
172.31.254.96   24:a9:37:44:1f:f3       PURE Storage
172.31.254.97   24:a9:37:44:22:ab       PURE Storage
172.31.254.150  dc:2c:6e:4b:86:f8       Routerboard.com
172.31.254.151  70:42:d3:80:e7:46       Ruijie Networks Co.,LTD
172.31.254.153  70:42:d3:80:d8:4e       Ruijie Networks Co.,LTD
172.31.254.158  3c:1b:f8:08:41:ef       Hangzhou Hikvision Digital Technology Co.,Ltd.
172.31.254.165  78:9a:18:43:d4:cb       (Unknown)
172.31.254.168  bc:24:11:2a:b5:d4       (Unknown)
172.31.254.161  00:d7:6d:b0:d7:40       Intel Corporate
172.31.254.163  5c:c9:d3:ab:68:44       PALLADIUM ENERGY ELETRONICA DA AMAZONIA LTDA
172.31.254.164  3e:9e:8f:62:81:16       (Unknown: locally administered)
172.31.254.179  bc:24:11:bd:d1:6f       (Unknown)
172.31.254.189  bc:24:11:9c:89:06       (Unknown)
172.31.254.156  a8:80:55:0b:30:1a       Tuya Smart Inc.
172.31.254.157  64:c6:d2:1c:07:e7       Seiko Epson Corporation
172.31.254.173  64:82:14:c4:b4:78       (Unknown)
172.31.254.172  f4:6a:dd:ea:9a:4b       Liteon Technology Corporation
172.31.254.154  70:42:d3:8c:bb:c5       Ruijie Networks Co.,LTD

22 packets received by filter, 0 packets dropped by kernel
Ending arp-scan 1.10.0: 256 hosts scanned in 2.175 seconds (117.70 hosts/sec). 22 responded`,
        success: true
      };
    }

    if (lowerCmd.startsWith('ping')) {
      const target = cmd.split(' ')[1] || 'localhost';
      return {
        output: `PING ${target} (127.0.0.1) 56(84) bytes of data.
64 bytes from localhost (127.0.0.1): icmp_seq=1 ttl=64 time=0.045 ms
64 bytes from localhost (127.0.0.1): icmp_seq=2 ttl=64 time=0.042 ms
64 bytes from localhost (127.0.0.1): icmp_seq=3 ttl=64 time=0.041 ms

--- ${target} ping statistics ---
3 packets transmitted, 3 received, 0% packet loss, time 2048ms
rtt min/avg/max/mdev = 0.041/0.042/0.045/0.002 ms`,
        success: true
      };
    }

    if (lowerCmd === 'ls' || lowerCmd === 'ls -la') {
      return {
        output: `total 48
drwxr-xr-x  8 user user 4096 Dec 20 10:30 .
drwxr-xr-x  3 user user 4096 Dec 20 10:25 ..
drwxr-xr-x  2 user user 4096 Dec 20 10:30 backend
-rw-r--r--  1 user user  123 Dec 20 10:25 package.json
-rw-r--r--  1 user user 1234 Dec 20 10:25 README.md
drwxr-xr-x  3 user user 4096 Dec 20 10:30 src`,
        success: true
      };
    }

    if (lowerCmd === 'pwd') {
      return {
        output: '/home/project',
        success: true
      };
    }

    if (lowerCmd === 'whoami') {
      return {
        output: 'arp-monitor-user',
        success: true
      };
    }

    if (lowerCmd.startsWith('ip addr') || lowerCmd === 'ifconfig') {
      return {
        output: `1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP group default qlen 1000
    link/ether bc:24:11:b0:e7:46 brd ff:ff:ff:ff:ff:ff
    inet 172.31.254.181/24 brd 172.31.254.255 scope global dynamic eth0
       valid_lft 86394sec preferred_lft 86394sec`,
        success: true
      };
    }

    if (lowerCmd === 'help' || lowerCmd === '--help') {
      return {
        output: `Available commands:
  arp-scan -I <interface> <subnet>  - Scan network for devices
  ping <host>                       - Ping a host
  ls                               - List directory contents
  pwd                              - Print working directory
  whoami                           - Show current user
  ip addr                          - Show network interfaces
  ifconfig                         - Show network configuration
  help                             - Show this help message
  clear                            - Clear terminal
  
Example: arp-scan -I eth0 172.31.254.0/24`,
        success: true
      };
    }

    if (lowerCmd === 'clear') {
      setHistory([]);
      return { output: '', success: true };
    }

    return {
      output: `bash: ${cmd}: command not found\nType 'help' for available commands.`,
      success: false
    };
  };

  const clearHistory = () => {
    setHistory([]);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      executeCommand();
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Terminal Console</h1>
        <p className="text-gray-400">Execute commands to validate network scanning functionality</p>
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
        {/* Terminal Header */}
        <div className="bg-gray-800 px-4 py-3 border-b border-gray-700 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Terminal className="h-5 w-5 text-green-400" />
            <span className="text-white font-medium">ARP Monitor Terminal</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={clearHistory}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
              title="Clear terminal"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Terminal Content */}
        <div 
          ref={terminalRef}
          className="h-96 overflow-y-auto p-4 bg-black text-green-400 font-mono text-sm"
        >
          {/* Welcome message */}
          {history.length === 0 && (
            <div className="text-gray-500 mb-4">
              <p>Welcome to ARP Monitor Terminal</p>
              <p>Type 'help' for available commands</p>
              <p>Example: arp-scan -I eth0 172.31.254.0/24</p>
            </div>
          )}

          {/* Command history */}
          {history.map((entry, index) => (
            <div key={index} className="mb-4">
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-blue-400">user@arp-monitor:~$</span>
                <span className="text-white">{entry.command}</span>
                <button
                  onClick={() => copyToClipboard(entry.command)}
                  className="p-1 text-gray-500 hover:text-gray-300 transition-colors"
                  title="Copy command"
                >
                  <Copy className="h-3 w-3" />
                </button>
              </div>
              {entry.output && (
                <pre className={`whitespace-pre-wrap ${entry.success ? 'text-green-400' : 'text-red-400'}`}>
                  {entry.output}
                </pre>
              )}
            </div>
          ))}

          {/* Current command line */}
          <div className="flex items-center space-x-2">
            <span className="text-blue-400">user@arp-monitor:~$</span>
            <input
              type="text"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1 bg-transparent text-white outline-none"
              placeholder="Enter command..."
              disabled={isExecuting}
            />
            {isExecuting && (
              <div className="animate-spin h-4 w-4 border-2 border-green-400 border-t-transparent rounded-full"></div>
            )}
          </div>
        </div>

        {/* Command Input */}
        <div className="bg-gray-800 px-4 py-3 border-t border-gray-700">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Type command here... (e.g., arp-scan -I eth0 172.31.254.0/24)"
              disabled={isExecuting}
            />
            <button
              onClick={executeCommand}
              disabled={!command.trim() || isExecuting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center space-x-2"
            >
              <Send className="h-4 w-4" />
              <span>Execute</span>
            </button>
          </div>
          <div className="mt-2 text-xs text-gray-400">
            Press Enter to execute • Type 'help' for available commands
          </div>
        </div>
      </div>

      {/* Quick Commands */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold text-white mb-3">Quick Commands</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            'arp-scan -I eth0 172.31.254.0/24',
            'arp-scan -I eth0 192.168.1.0/24',
            'ping 8.8.8.8',
            'ip addr show',
            'ls -la',
            'help'
          ].map((cmd) => (
            <button
              key={cmd}
              onClick={() => setCommand(cmd)}
              className="p-3 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-lg text-left transition-colors"
            >
              <code className="text-green-400 text-sm">{cmd}</code>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}