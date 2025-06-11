import express from 'express';
import { spawn } from 'child_process';
import logger from '../utils/logger.js';

const router = express.Router();

// Execute command
router.post('/execute', async (req, res) => {
  try {
    const { command } = req.body;
    
    if (!command || typeof command !== 'string') {
      return res.status(400).json({ error: 'Command is required' });
    }

    // Security: Only allow specific commands
    const allowedCommands = [
      'arp-scan',
      'ping',
      'ls',
      'pwd',
      'whoami',
      'ip',
      'ifconfig',
      'which',
      'cat',
      'echo'
    ];

    const commandParts = command.trim().split(' ');
    const baseCommand = commandParts[0];

    if (!allowedCommands.includes(baseCommand)) {
      return res.status(403).json({ 
        error: `Command '${baseCommand}' is not allowed`,
        output: `bash: ${command}: command not found\nAllowed commands: ${allowedCommands.join(', ')}`
      });
    }

    // Execute command
    const result = await executeCommand(command);
    res.json(result);
    
  } catch (error) {
    logger.error('Error executing command:', error);
    res.status(500).json({ 
      error: 'Failed to execute command',
      output: error.message
    });
  }
});

async function executeCommand(command) {
  return new Promise((resolve) => {
    const parts = command.trim().split(' ');
    const cmd = parts[0];
    const args = parts.slice(1);
    
    const process = spawn(cmd, args);
    let stdout = '';
    let stderr = '';
    
    process.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    process.on('close', (code) => {
      const success = code === 0;
      const output = success ? stdout : stderr || `Command exited with code ${code}`;
      
      resolve({
        success,
        output: output.trim(),
        exitCode: code
      });
    });
    
    process.on('error', (error) => {
      resolve({
        success: false,
        output: `Error: ${error.message}`,
        exitCode: -1
      });
    });
    
    // Timeout after 30 seconds
    setTimeout(() => {
      process.kill();
      resolve({
        success: false,
        output: 'Command timed out after 30 seconds',
        exitCode: -1
      });
    }, 30000);
  });
}

export default router;